// Raw archive: every fetch run writes one immutable snapshot folder; nothing is
// ever deleted. Layout (sizes and growth in README.md):
//
//   <raw>/<snapshot>/                  run start in UTC, e.g. 2026-10-04T23-15-00Z
//     facilities.json.gz               GET /v6/facilities/ response, as sent
//     classes/<facilityId>.json.gz     POST allclasses response for one club, as sent
//     classes/<facilityId>.<start>.json.gz   one per request, only if a club's range was split
//     manifest.json                    written LAST; a folder without it is incomplete and ignored
//
// A build composes, per club, the newest complete snapshot whose fetch of that
// club succeeded, so a failed club (or a --clubs subset run) falls back to older data.

import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { RawClass, RawClassesResponse, RawFacilitiesResponse, RawFacility } from "../apis/types.ts";
import type { LocalDate } from "../shared/schema.ts";
import { exists, readJson, readJsonGz } from "./io.ts";

export const MANIFEST_FILE = "manifest.json";
export const FACILITIES_FILE = "facilities.json.gz";
const SNAPSHOT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z(?:-\d+)?$/;

/** 2026-10-04T23:15:00.123Z -> "2026-10-04T23-15-00Z" (sorts chronologically, filesystem-safe). */
export function snapshotName(at: Date): string {
  return `${at.toISOString().slice(0, 19).replace(/:/g, "-")}Z`;
}

export interface RequestRecord {
  startDate: LocalDate; // as sent, club-local, inclusive
  endDate: LocalDate; // as sent, club-local, EXCLUSIVE
  classes: number;
  file: string; // relative to the snapshot folder
}

export interface ClubRecord {
  name: string;
  ok: boolean;
  timeZone: string | null; // IANA zone used to pick "today"
  range: { start: LocalDate; end: LocalDate } | null; // requested, inclusive
  requests: RequestRecord[];
  classes: number;
  firstDate: LocalDate | null;
  lastDate: LocalDate | null;
  fetchedAt: string | null; // when this club's last request finished
  error?: string;
  /** Failed clubs only: the newest earlier complete snapshot with this club, which builds will use. */
  fallback?: string | null;
}

export interface Manifest {
  format: 1;
  snapshot: string;
  startedAt: string; // ISO UTC
  finishedAt: string;
  days: number; // club-local days requested from today
  clubsRequested: string[] | null; // --clubs subset, or null for every open club
  http: { requests: number; retries: number };
  bytes: { json: number; gzip: number }; // responses as received / as stored
  facilities: {
    file: string | null; // this snapshot's facilities response, null if the request failed
    source: string; // snapshot whose facilities list defined the clubs for this run
    openClubs: number;
    note?: string; // why `source` is not this snapshot
  };
  clubs: Record<string, ClubRecord>; // by facilityId
  summary: { ok: number; failed: string[]; empty: string[] };
  /** Observed published horizon: first/last class dates over successful clubs, and how many clubs hit each. */
  horizon: { start: LocalDate | null; end: LocalDate | null; firstDates: Record<string, number>; lastDates: Record<string, number> };
}

export async function createSnapshotDir(rawDir: string, startedAt: Date): Promise<string> {
  await mkdir(rawDir, { recursive: true });
  const base = snapshotName(startedAt);
  for (let n = 0; ; n++) {
    const name = n === 0 ? base : `${base}-${n}`;
    try {
      await mkdir(join(rawDir, name));
      await mkdir(join(rawDir, name, "classes"));
      return name;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST" || n > 50) throw err;
    }
  }
}

/** Snapshot folder names, oldest first, with whether each has a manifest. */
export async function listSnapshots(rawDir: string): Promise<{ name: string; complete: boolean }[]> {
  let names: string[];
  try {
    names = (await readdir(rawDir, { withFileTypes: true })).filter((e) => e.isDirectory() && SNAPSHOT_RE.test(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
  names.sort();
  return Promise.all(names.map(async (name) => ({ name, complete: await exists(join(rawDir, name, MANIFEST_FILE)) })));
}

export async function completeSnapshots(rawDir: string): Promise<string[]> {
  return (await listSnapshots(rawDir)).filter((s) => s.complete).map((s) => s.name);
}

/** Reads manifests on demand and remembers them (snapshots are immutable). */
export class Archive {
  readonly rawDir: string;
  #manifests = new Map<string, Manifest>();

  constructor(rawDir: string) {
    this.rawDir = rawDir;
  }

  async manifest(snapshot: string): Promise<Manifest> {
    let m = this.#manifests.get(snapshot);
    if (!m) {
      m = await readJson<Manifest>(join(this.rawDir, snapshot, MANIFEST_FILE));
      this.#manifests.set(snapshot, m);
    }
    return m;
  }

  async facilities(snapshot: string): Promise<RawFacility[]> {
    const res = await readJsonGz<RawFacilitiesResponse>(join(this.rawDir, snapshot, FACILITIES_FILE));
    return res.response?.facilities ?? [];
  }

  /** The facilities list a run used: from its own response, or the snapshot its manifest points to. */
  async facilitiesFor(snapshot: string): Promise<{ source: string; facilities: RawFacility[] }> {
    const source = (await this.manifest(snapshot)).facilities.source;
    return { source, facilities: await this.facilities(source) };
  }

  /** All classes of one club in one snapshot, concatenated across its request files. */
  async clubClasses(snapshot: string, record: ClubRecord): Promise<RawClass[]> {
    const out: RawClass[] = [];
    for (const r of record.requests) {
      const res = await readJsonGz<RawClassesResponse>(join(this.rawDir, snapshot, r.file));
      out.push(...(res.classes ?? []));
    }
    return out;
  }

  /**
   * For each facility id, the newest snapshot in `candidates` (oldest-first
   * names) whose fetch of that club succeeded. Ids with no such snapshot are absent.
   */
  async resolveClubs(candidates: readonly string[], ids: readonly string[]): Promise<Map<string, { snapshot: string; record: ClubRecord }>> {
    const found = new Map<string, { snapshot: string; record: ClubRecord }>();
    const pending = new Set(ids);
    for (let i = candidates.length - 1; i >= 0 && pending.size > 0; i--) {
      const m = await this.manifest(candidates[i]);
      for (const id of [...pending]) {
        const record = m.clubs[id];
        if (record?.ok) {
          found.set(id, { snapshot: candidates[i], record });
          pending.delete(id);
        }
      }
    }
    return found;
  }
}
