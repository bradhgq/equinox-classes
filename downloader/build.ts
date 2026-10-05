// Stage 2: raw snapshot -> published data (index.json, clubs/<id>.json) + reports.
// No network, so it can be re-run any time (e.g. after editing shared/families.ts).

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { ianaTimeZone } from "../apis/equinox.ts";
import type { RawClass, RawFacility } from "../apis/types.ts";
import { SCHEMA_VERSION, type ClubSchedule, type DataIndex, type LocalDate } from "../shared/schema.ts";
import { exists, listFiles, readJson, writeFileAtomic, writeJsonAtomic } from "./io.ts";
import { buildClassNameReport, renderClassNameReportMarkdown, type ClassNameReport } from "./report.ts";
import { decidePublish, type PublishDecision } from "./sanity.ts";
import { Archive, completeSnapshots } from "./snapshots.ts";
import {
  assertUniqueSlugs,
  buildCategories,
  buildCities,
  buildFamilies,
  clubFromFacility,
  clubName,
  clubStats,
  horizonOf,
  placeOf,
  transformClubClasses,
  type ClubClasses,
} from "./transform.ts";

/** One club's data as the build needs it; the raw class objects are not kept (memory). */
export interface PreparedClub extends ClubClasses {
  snapshot: string; // snapshot the data came from
  fetchedAt: string; // that snapshot's startedAt
  range: { start: LocalDate; end: LocalDate }; // requested, inclusive
}

export function prepareClub(
  raws: readonly RawClass[],
  facilityId: string,
  source: { snapshot: string; fetchedAt: string; range: { start: LocalDate; end: LocalDate } },
): PreparedClub {
  return { ...source, range: { ...source.range }, ...transformClubClasses(raws, facilityId) };
}

export interface DatasetInput {
  facilities: readonly RawFacility[];
  /** Keyed by facilityId; clubs without any successful fetch are absent. */
  clubs: ReadonlyMap<string, PreparedClub>;
  /** The snapshot being built: its name and startedAt (= DataIndex.generatedAt). */
  snapshot: { name: string; startedAt: string };
}

export interface Dataset {
  index: DataIndex;
  schedules: ClubSchedule[];
  report: ClassNameReport;
  totalClasses: number;
  /** Clubs whose data came from an older snapshot than the one being built. */
  fallbacks: { id: string; name: string; snapshot: string }[];
  warnings: string[];
}

/** Pure: facilities + prepared per-club data -> everything the build writes. */
export function buildDataset(input: DatasetInput): Dataset {
  const warnings: string[] = [];
  const entries = [];
  const neverFetched: string[] = [];
  const fallbacks: Dataset["fallbacks"] = [];
  for (const f of input.facilities.filter((x) => x.status === "Open")) {
    const id = String(f.facilityId);
    const label = `club ${id} ${clubName(f)}`;
    const club = input.clubs.get(id);
    if (!club) {
      neverFetched.push(id);
      continue;
    }
    let timeZone: string;
    try {
      timeZone = ianaTimeZone(f.timeZone);
    } catch (err) {
      warnings.push(`${label}: ${(err as Error).message}; left out of the index`);
      continue;
    }
    if (club.foreign) warnings.push(`${label}: dropped ${club.foreign} classes belonging to other facilities`);
    if (club.invalid) warnings.push(`${label}: dropped ${club.invalid} classes missing id/name/times`);
    if (club.duplicates) warnings.push(`${label}: dropped ${club.duplicates} duplicate classInstanceIds`);
    if (club.snapshot !== input.snapshot.name) fallbacks.push({ id, name: clubName(f), snapshot: club.snapshot });
    entries.push({ f, id, timeZone, place: placeOf(f), ...club });
  }
  if (neverFetched.length) {
    const list = neverFetched.length > 12 ? `${neverFetched.slice(0, 12).join(", ")}, ...` : neverFetched.join(", ");
    warnings.push(`${neverFetched.length} open clubs have never been fetched successfully and are left out of the index: ${list}`);
  }

  const clubs = entries.map((e) => clubFromFacility(e.f, clubStats(e.classes)));
  assertUniqueSlugs(clubs);
  const located = buildCities(entries.map((e, i) => ({ club: clubs[i], place: e.place })));
  const categories = buildCategories(
    entries.flatMap((e) => e.classes.map((c) => c.workoutCategoryId)),
    (w) => warnings.push(w),
  );
  const index: DataIndex = {
    version: SCHEMA_VERSION,
    generatedAt: input.snapshot.startedAt,
    horizon: horizonOf(clubs, entries.map((e) => e.range)),
    categories,
    cities: located.cities,
    clubs: located.clubs,
    families: buildFamilies(entries.map((e) => ({ clubId: e.id, classes: e.classes }))),
  };
  const schedules: ClubSchedule[] = entries.map((e) => ({
    version: SCHEMA_VERSION,
    clubId: e.id,
    generatedAt: e.fetchedAt,
    timeZone: e.timeZone,
    range: e.range,
    classes: e.classes,
    descriptions: e.descriptions,
  }));

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const report = buildClassNameReport(
    entries.map((e) => ({ clubId: e.id, clubName: clubName(e.f), classes: e.classes, specialEventIds: e.specialEventIds })),
    (id) => catName.get(id) ?? `Unknown ${id}`,
    input.snapshot.startedAt,
    index.horizon,
  );
  const totalClasses = entries.reduce((n, e) => n + e.classes.length, 0);
  return { index, schedules, report, totalClasses, fallbacks, warnings };
}

export interface BuildOptions {
  outDir: string;
  rawDir: string;
  /** Snapshot to build; default the newest complete one. */
  snapshot?: string;
  force: boolean;
  log: (msg: string) => void;
}

export interface BuildSummary {
  snapshot: string;
  decision: PublishDecision;
  prevTotal: number | null;
  totalClasses: number;
  clubs: number;
  clubsWithClasses: number;
  horizon: { start: string; end: string };
  fallbacks: Dataset["fallbacks"];
  warnings: string[];
  files: { index: number; clubsTotal: number; clubFiles: number; largest: { name: string; bytes: number } | null; removed: string[] };
}

/** Total classes in the currently published index.json, or null if missing/unreadable. */
async function publishedTotal(indexPath: string, log: (m: string) => void): Promise<number | null> {
  if (!(await exists(indexPath))) return null;
  try {
    const prev = await readJson<{ clubs?: { classCount?: number }[] }>(indexPath);
    if (!Array.isArray(prev.clubs)) throw new Error("no clubs array");
    return prev.clubs.reduce((n, c) => n + (typeof c.classCount === "number" ? c.classCount : 0), 0);
  } catch (err) {
    log(`WARN existing ${indexPath} is unreadable (${(err as Error).message}); skipping the drop check baseline`);
    return null;
  }
}

export async function runBuild(opts: BuildOptions): Promise<BuildSummary> {
  const { log, outDir, rawDir } = opts;
  const complete = await completeSnapshots(rawDir);
  if (!complete.length) throw new Error(`No complete snapshot in ${rawDir}; run a fetch first (without --build-only).`);
  const target = opts.snapshot ?? (complete.at(-1) as string);
  if (!complete.includes(target)) throw new Error(`Snapshot ${target} not found in ${rawDir}, or incomplete (no manifest.json).`);
  const archive = new Archive(rawDir);
  const manifest = await archive.manifest(target);
  const { facilities } = await archive.facilitiesFor(target);

  // Newest complete snapshot (up to the target) that fetched each open club successfully.
  // Each club's raw responses are reduced to ClassItems as they are read, to keep memory flat.
  const openIds = facilities.filter((f) => f.status === "Open").map((f) => String(f.facilityId));
  const sources = await archive.resolveClubs(
    complete.filter((s) => s <= target),
    openIds,
  );
  const clubs = new Map<string, PreparedClub>();
  for (const id of openIds) {
    const src = sources.get(id);
    if (!src?.record.range) continue;
    const fetchedAt = (await archive.manifest(src.snapshot)).startedAt;
    const raws = await archive.clubClasses(src.snapshot, src.record);
    clubs.set(id, prepareClub(raws, id, { snapshot: src.snapshot, fetchedAt, range: src.record.range }));
  }

  const ds = buildDataset({ facilities, clubs, snapshot: { name: target, startedAt: manifest.startedAt } });
  log(`build: snapshot ${target}${ds.fallbacks.length ? `, ${ds.fallbacks.length} clubs from older snapshots` : ""}`);
  for (const fb of ds.fallbacks) log(`  fallback: ${fb.id} ${fb.name} <- ${fb.snapshot}`);
  for (const w of ds.warnings) log(`WARN ${w}`);

  const indexPath = join(outDir, "index.json");
  const prevTotal = await publishedTotal(indexPath, log);
  const decision = decidePublish(prevTotal, ds.totalClasses, opts.force);
  const summary: BuildSummary = {
    snapshot: target,
    decision,
    prevTotal,
    totalClasses: ds.totalClasses,
    clubs: ds.index.clubs.length,
    clubsWithClasses: ds.index.clubs.filter((c) => c.classCount > 0).length,
    horizon: ds.index.horizon,
    fallbacks: ds.fallbacks,
    warnings: ds.warnings,
    files: { index: 0, clubsTotal: 0, clubFiles: 0, largest: null, removed: [] },
  };
  if (!decision.publish) {
    log(`REFUSING to publish: ${decision.reason}. Kept the existing files; re-run with --force to override.`);
    return summary;
  }

  // Club files first, index last: a reader holding the old index still finds
  // every club file it references.
  const clubsDir = join(outDir, "clubs");
  const keep = new Set<string>();
  for (const s of ds.schedules) {
    const name = `${s.clubId}.json`;
    keep.add(name);
    const bytes = await writeJsonAtomic(join(clubsDir, name), s);
    summary.files.clubsTotal += bytes;
    summary.files.clubFiles++;
    if (!summary.files.largest || bytes > summary.files.largest.bytes) summary.files.largest = { name, bytes };
  }
  summary.files.index = await writeJsonAtomic(indexPath, ds.index);
  for (const name of await listFiles(clubsDir)) {
    if (/^\d+\.json$/.test(name) && !keep.has(name)) {
      await unlink(join(clubsDir, name));
      summary.files.removed.push(name);
    }
  }

  const reportsDir = join(outDir, "reports");
  await writeJsonAtomic(join(reportsDir, "class-names.json"), ds.report, true);
  await writeFileAtomic(join(reportsDir, "class-names.md"), renderClassNameReportMarkdown(ds.report));
  log(`build: wrote ${summary.files.clubFiles} club files + index.json (${decision.reason}); reports in ${reportsDir}`);
  return summary;
}
