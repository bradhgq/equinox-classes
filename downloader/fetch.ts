// Stage 1: Equinox API -> a new raw snapshot (see snapshots.ts). One allclasses
// request per open club, covering club-local today .. today + days. Why one
// club per request and why the generous window: README.md "Methodology".

import { join } from "node:path";
import { EquinoxClient, ianaTimeZone } from "../apis/equinox.ts";
import type { RawClassesResponse, RawFacility } from "../apis/types.ts";
import type { LocalDate } from "../shared/schema.ts";
import { addDays, daysBetween, todayIn } from "./dates.ts";
import { formatBytes, writeJsonAtomic, writeJsonGzAtomic } from "./io.ts";
import {
  Archive,
  completeSnapshots,
  createSnapshotDir,
  FACILITIES_FILE,
  MANIFEST_FILE,
  type ClubRecord,
  type Manifest,
  type RequestRecord,
} from "./snapshots.ts";
import { clubName } from "./transform.ts";

/**
 * A response this big is re-fetched as two half ranges. Multi-club requests
 * lost classes silently at ~1,440 results; single-club requests were complete
 * up to the largest we could make (1,237). A 6-week window at the busiest club
 * is ~650 today, so this only triggers if Equinox publishes much further ahead.
 */
export const SPLIT_THRESHOLD = 1000;

export interface RangePart<T> {
  startDate: LocalDate;
  endDate: LocalDate; // exclusive
  value: T;
  count: number;
}

/** Fetch [start, endExclusive), bisecting while a response reaches `threshold` items. */
export async function fetchRange<T>(
  get: (startDate: LocalDate, endDateExclusive: LocalDate) => Promise<T>,
  count: (value: T) => number,
  start: LocalDate,
  endExclusive: LocalDate,
  threshold = SPLIT_THRESHOLD,
): Promise<{ parts: RangePart<T>[]; discarded: number }> {
  const parts: RangePart<T>[] = [];
  let discarded = 0;
  const go = async (s: LocalDate, e: LocalDate): Promise<void> => {
    const value = await get(s, e);
    const n = count(value);
    const days = daysBetween(s, e);
    if (n < threshold || days < 2) {
      parts.push({ startDate: s, endDate: e, value, count: n });
      return;
    }
    discarded++;
    const mid = addDays(s, Math.floor(days / 2));
    await go(s, mid);
    await go(mid, e);
  };
  await go(start, endExclusive);
  return { parts, discarded };
}

export interface FetchOptions {
  rawDir: string;
  /** Club-local days to request, starting today. */
  days: number;
  /** Facility ids to fetch (default: every open club). */
  clubIds?: string[];
  now?: Date;
  log: (msg: string) => void;
  /** Defaults to a real EquinoxClient; tests pass a fake. */
  client?: Pick<EquinoxClient, "facilitiesResponse" | "classesResponse">;
}

const countOpen = (fs: readonly RawFacility[]) => fs.filter((f) => f.status === "Open").length;
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

async function pool<T>(items: readonly T[], workers: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, worker));
}

function tally(dates: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dates) if (d) out[d] = (out[d] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort());
}

/** Fetches a new snapshot; returns its manifest (also written, last, as manifest.json). */
export async function runFetch(opts: FetchOptions): Promise<Manifest> {
  const { log, rawDir } = opts;
  const startedAt = opts.now ?? new Date();
  let requests = 0;
  let retries = 0;
  const bytes = { json: 0, gzip: 0 };
  const client =
    opts.client ??
    new EquinoxClient({
      log: (m) => {
        if (m.startsWith("retry")) retries++;
        log(`  ${m}`);
      },
    });
  const archive = new Archive(rawDir);
  const earlier = await completeSnapshots(rawDir);
  const snapshot = await createSnapshotDir(rawDir, startedAt);
  const dir = join(rawDir, snapshot);
  const save = async (file: string, value: unknown) => {
    const size = await writeJsonGzAtomic(join(dir, file), value);
    bytes.json += size.json;
    bytes.gzip += size.gzip;
    return size;
  };
  log(`fetch: snapshot ${snapshot}`);

  // Facilities. Keep this run's response either way; fall back to the previous
  // run's list if the request failed or the list lost more than half the open clubs.
  const previous = earlier.length ? await archive.facilitiesFor(earlier[earlier.length - 1]) : null;
  let facilities: RawFacility[];
  let facilitiesInfo: Manifest["facilities"];
  try {
    requests++;
    const res = await client.facilitiesResponse();
    await save(FACILITIES_FILE, res);
    const fresh = res.response?.facilities ?? [];
    const open = countOpen(fresh);
    const prevOpen = previous ? countOpen(previous.facilities) : 0;
    if (previous && (open === 0 || open * 2 < prevOpen)) {
      const note = `response lists ${open} open clubs vs ${prevOpen} before; used the list from ${previous.source}`;
      log(`WARN facilities: ${note}`);
      facilities = previous.facilities;
      facilitiesInfo = { file: FACILITIES_FILE, source: previous.source, openClubs: prevOpen, note };
    } else {
      if (open === 0) throw new Error("facilities response lists no open clubs");
      facilities = fresh;
      facilitiesInfo = { file: FACILITIES_FILE, source: snapshot, openClubs: open };
    }
  } catch (err) {
    if (!previous) throw new Error(`facilities fetch failed and no earlier snapshot has a list: ${errMsg(err)}`);
    const note = `request failed (${errMsg(err)}); used the list from ${previous.source}`;
    log(`WARN facilities: ${note}`);
    facilities = previous.facilities;
    facilitiesInfo = { file: null, source: previous.source, openClubs: countOpen(previous.facilities), note };
  }

  let targets = facilities.filter((f) => f.status === "Open");
  if (opts.clubIds?.length) {
    const wanted = new Set(opts.clubIds);
    for (const id of wanted) {
      if (!targets.some((f) => String(f.facilityId) === id)) log(`WARN --clubs: ${id} is not an open club; skipped`);
    }
    targets = targets.filter((f) => wanted.has(String(f.facilityId)));
  }
  log(`fetch: ${targets.length} of ${facilitiesInfo.openClubs} open clubs, ${opts.days} days from club-local today`);

  const clubs: Record<string, ClubRecord> = {};
  const width = String(targets.length).length;
  await pool(targets, 2, async (f, i) => {
    const id = String(f.facilityId);
    const name = clubName(f);
    const tag = `[${String(i + 1).padStart(width)}/${targets.length}] ${id} ${name}`;
    const t0 = Date.now();
    const record: ClubRecord = {
      name,
      ok: false,
      timeZone: null,
      range: null,
      requests: [],
      classes: 0,
      firstDate: null,
      lastDate: null,
      fetchedAt: null,
    };
    clubs[id] = record;
    try {
      record.timeZone = ianaTimeZone(f.timeZone);
      const start = todayIn(record.timeZone, startedAt);
      const endExclusive = addDays(start, opts.days);
      record.range = { start, end: addDays(endExclusive, -1) };
      const { parts, discarded } = await fetchRange(
        (s, e) => {
          requests++;
          return client.classesResponse({ facilityIds: [id], startDate: s, endDate: e });
        },
        (res: RawClassesResponse) => res.classes?.length ?? 0,
        start,
        endExclusive,
      );
      let stored = 0;
      const files: RequestRecord[] = [];
      const dates: string[] = [];
      for (const p of parts) {
        const file = parts.length === 1 ? `classes/${id}.json.gz` : `classes/${id}.${p.startDate}.json.gz`;
        stored += (await save(file, p.value)).gzip;
        files.push({ startDate: p.startDate, endDate: p.endDate, classes: p.count, file });
        for (const c of p.value.classes ?? []) dates.push(c.startLocal.slice(0, 10));
      }
      dates.sort();
      Object.assign(record, {
        ok: true,
        requests: files,
        classes: dates.length,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        fetchedAt: new Date().toISOString(),
      });
      const span = record.firstDate ? `${record.firstDate}..${record.lastDate}` : "no classes";
      const split = discarded ? ` (re-fetched in ${files.length} parts: response reached ${SPLIT_THRESHOLD} classes)` : "";
      log(`${tag}: ${record.classes} classes, ${span}, ${formatBytes(stored)} gz, ${((Date.now() - t0) / 1000).toFixed(1)}s${split}`);
    } catch (err) {
      record.error = errMsg(err);
      log(`${tag}: FAILED: ${record.error}`);
    }
  });

  // For failed clubs, note which earlier snapshot a build will fall back to.
  const failed = Object.keys(clubs).filter((id) => !clubs[id].ok);
  if (failed.length) {
    const fallbacks = await archive.resolveClubs(earlier, failed);
    for (const id of failed) clubs[id].fallback = fallbacks.get(id)?.snapshot ?? null;
  }

  const okRecords = Object.values(clubs).filter((c) => c.ok);
  const firstDates = okRecords.map((c) => c.firstDate);
  const lastDates = okRecords.map((c) => c.lastDate);
  const known = (ds: (string | null)[]) => ds.filter((d): d is string => d !== null).sort();
  const sortedClubs = Object.fromEntries(Object.entries(clubs).sort(([a], [b]) => Number(a) - Number(b)));
  const manifest: Manifest = {
    format: 1,
    snapshot,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    days: opts.days,
    clubsRequested: opts.clubIds?.length ? [...opts.clubIds] : null,
    http: { requests: requests + retries, retries },
    bytes,
    facilities: facilitiesInfo,
    clubs: sortedClubs,
    summary: {
      ok: okRecords.length,
      failed: failed.sort((a, b) => Number(a) - Number(b)),
      empty: Object.keys(sortedClubs).filter((id) => clubs[id].ok && clubs[id].classes === 0),
    },
    horizon: { start: known(firstDates)[0] ?? null, end: known(lastDates).at(-1) ?? null, firstDates: tally(firstDates), lastDates: tally(lastDates) },
  };
  await writeJsonAtomic(join(dir, MANIFEST_FILE), manifest, true); // last: marks the snapshot complete
  return manifest;
}
