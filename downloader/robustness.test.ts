// The snapshot archive and failure handling of both stages, against temp
// directories and a fake API client (no network).

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import type { ClassQuery } from "../apis/equinox.ts";
import type { RawClass, RawClassesResponse, RawFacility } from "../apis/types.ts";
import { runBuild } from "./build.ts";
import { runFetch } from "./fetch.ts";
import { exists, readJson, readJsonGz } from "./io.ts";
import { completeSnapshots, createSnapshotDir, listSnapshots, snapshotName, type Manifest } from "./snapshots.ts";
import { at, classesResponse, facilitiesResponse, facility, rawClass, writeSnapshot } from "./testing.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "eqx-downloader-test-"));
  dirs.push(d);
  return d;
}
after(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

const quiet = () => {};
const T1 = new Date("2026-10-04T11:00:00Z");
const T2 = new Date("2026-10-04T23:30:00Z"); // Sunday evening in New York, already Monday in London

function fakeClient(facilities: RawFacility[] | Error, classes: (q: ClassQuery) => RawClass[] | Error) {
  const queries: ClassQuery[] = [];
  return {
    queries,
    client: {
      async facilitiesResponse() {
        if (facilities instanceof Error) throw facilities;
        return facilitiesResponse(facilities);
      },
      async classesResponse(q: ClassQuery): Promise<RawClassesResponse> {
        queries.push(q);
        const r = classes(q);
        if (r instanceof Error) throw r;
        return classesResponse(r);
      },
    },
  };
}

const clubs = [
  facility({ facilityId: "112", webName: "Greenwich Avenue" }),
  facility({ facilityId: "871", webName: "Kensington", region: "London", subRegion: null, timeZone: "GMT Standard Time" }),
  facility({ facilityId: "999", webName: "Soon", status: "ComingSoon" }),
];
const oneClassPerClub = (q: ClassQuery) => [rawClass(at(`${q.startDate}T09:00`), String(q.facilityIds[0]))];

// --- snapshot naming and listing ------------------------------------------------

test("snapshot names sort chronologically; collisions get a suffix; strays are ignored", async () => {
  assert.equal(snapshotName(new Date("2026-10-04T23:15:07.456Z")), "2026-10-04T23-15-07Z");
  const raw = await tempDir();
  assert.equal(await createSnapshotDir(raw, T1), "2026-10-04T11-00-00Z");
  assert.equal(await createSnapshotDir(raw, T1), "2026-10-04T11-00-00Z-1");
  await mkdir(join(raw, "notes"));
  await writeFile(join(raw, "README.txt"), "x");
  assert.deepEqual(await listSnapshots(raw), [
    { name: "2026-10-04T11-00-00Z", complete: false },
    { name: "2026-10-04T11-00-00Z-1", complete: false },
  ]);
  assert.deepEqual(await completeSnapshots(raw), []);
});

// --- fetch ----------------------------------------------------------------------

test("fetch writes a snapshot: responses as sent, club-local ranges, manifest last", async () => {
  const raw = await tempDir();
  const api = fakeClient(clubs, oneClassPerClub);
  const m = await runFetch({ rawDir: raw, days: 42, now: T2, log: quiet, client: api.client });
  assert.equal(m.snapshot, "2026-10-04T23-30-00Z");
  assert.deepEqual(
    api.queries.map((q) => [q.facilityIds, q.startDate, q.endDate]).sort(),
    [
      [["112"], "2026-10-04", "2026-11-15"],
      [["871"], "2026-10-05", "2026-11-16"],
    ],
  );
  const dir = join(raw, m.snapshot);
  assert.deepEqual(await readJsonGz(join(dir, "facilities.json.gz")), facilitiesResponse(clubs));
  const res871 = await readJsonGz<RawClassesResponse>(join(dir, "classes/871.json.gz"));
  assert.deepEqual(Object.keys(res871), ["messages", "classes"]);
  assert.equal(res871.classes?.[0].startLocal, "2026-10-05T09:00:00");

  assert.deepEqual(await readJson<Manifest>(join(dir, "manifest.json")), m);
  assert.equal(m.http.requests, 3);
  assert.deepEqual(m.facilities, { file: "facilities.json.gz", source: m.snapshot, openClubs: 2 });
  assert.deepEqual(m.clubs["871"].range, { start: "2026-10-05", end: "2026-11-15" });
  assert.deepEqual(m.clubs["871"].requests, [{ startDate: "2026-10-05", endDate: "2026-11-16", classes: 1, file: "classes/871.json.gz" }]);
  assert.equal(m.clubs["871"].timeZone, "Europe/London");
  assert.deepEqual(m.summary, { ok: 2, failed: [], empty: [] });
  assert.deepEqual(m.horizon, {
    start: "2026-10-04",
    end: "2026-10-05",
    firstDates: { "2026-10-04": 1, "2026-10-05": 1 },
    lastDates: { "2026-10-04": 1, "2026-10-05": 1 },
  });
  assert.deepEqual(await completeSnapshots(raw), [m.snapshot]);
});

test("fetch: a failing club is recorded with the snapshot builds will fall back to", async () => {
  const raw = await tempDir();
  const first = await runFetch({ rawDir: raw, days: 42, now: T1, log: quiet, client: fakeClient(clubs, oneClassPerClub).client });
  const failing = fakeClient(clubs, (q) => (q.facilityIds[0] === "871" ? new Error("HTTP 503 after retries") : oneClassPerClub(q)));
  const m = await runFetch({ rawDir: raw, days: 42, now: T2, log: quiet, client: failing.client });
  assert.deepEqual(m.summary.failed, ["871"]);
  assert.equal(m.clubs["871"].ok, false);
  assert.equal(m.clubs["871"].error, "HTTP 503 after retries");
  assert.equal(m.clubs["871"].fallback, first.snapshot);
  assert.equal(await exists(join(raw, m.snapshot, "classes/871.json.gz")), false);
  assert.equal(await exists(join(raw, first.snapshot, "classes/871.json.gz")), true, "older snapshot untouched");
});

test("fetch: facilities failure uses the previous snapshot's list, or aborts without one", async () => {
  const raw = await tempDir();
  const down = fakeClient(new Error("ECONNRESET"), oneClassPerClub);
  await assert.rejects(runFetch({ rawDir: raw, days: 7, now: T1, log: quiet, client: down.client }), /no earlier snapshot/);
  assert.deepEqual(await listSnapshots(raw), [{ name: "2026-10-04T11-00-00Z", complete: false }], "aborted run stays incomplete");

  const ok = await runFetch({ rawDir: raw, days: 7, now: new Date("2026-10-04T12:00:00Z"), log: quiet, client: fakeClient(clubs, oneClassPerClub).client });
  const m = await runFetch({ rawDir: raw, days: 7, now: T2, log: quiet, client: down.client });
  assert.equal(m.facilities.file, null);
  assert.equal(m.facilities.source, ok.snapshot);
  assert.match(m.facilities.note ?? "", /ECONNRESET/);
  assert.equal(m.summary.ok, 2);
});

test("fetch: a facilities list that lost more than half the open clubs is kept but not used", async () => {
  const raw = await tempDir();
  const five = ["1", "2", "3", "4", "5"].map((id) => facility({ facilityId: id, webName: `Club ${id}` }));
  const before = await runFetch({ rawDir: raw, days: 7, now: T1, log: quiet, client: fakeClient(five, () => []).client });
  const shrunk = five.map((f, i) => (i < 2 ? f : { ...f, status: "Closed" })); // 5 -> 2 open
  const m = await runFetch({ rawDir: raw, days: 7, now: T2, log: quiet, client: fakeClient(shrunk, () => []).client });
  assert.equal(m.facilities.file, "facilities.json.gz");
  assert.equal(m.facilities.source, before.snapshot);
  assert.equal(Object.keys(m.clubs).length, 5);
  const plausible = five.map((f, i) => (i < 3 ? f : { ...f, status: "Closed" })); // 5 -> 3 open is believable
  const m2 = await runFetch({ rawDir: raw, days: 7, now: new Date("2026-10-05T11:00:00Z"), log: quiet, client: fakeClient(plausible, () => []).client });
  assert.equal(m2.facilities.source, m2.snapshot);
  assert.equal(Object.keys(m2.clubs).length, 3);
});

test("fetch: --clubs fetches only those clubs", async () => {
  const raw = await tempDir();
  const m = await runFetch({ rawDir: raw, days: 7, clubIds: ["871", "999"], now: T1, log: quiet, client: fakeClient(clubs, () => []).client });
  assert.deepEqual(Object.keys(m.clubs), ["871"]);
  assert.deepEqual(m.clubsRequested, ["871", "999"]);
  assert.deepEqual(m.summary.empty, ["871"]);
});

// --- build ----------------------------------------------------------------------

const nyClubs = ["1", "2", "3"].map((id) => facility({ facilityId: id, webName: `Club ${id}` }));
const classesFor = (id: string, n: number, day = "2026-10-05") =>
  Array.from({ length: n }, (_, i) => rawClass({ ...at(`${day}T0${(i % 9) + 1}:00`) }, id));

test("build: newest complete snapshot; failed clubs fall back; incomplete snapshots are ignored", async () => {
  const out = await tempDir();
  const raw = join(out, "raw");
  const s1 = await writeSnapshot(raw, {
    startedAt: "2026-10-04T11:00:00.000Z",
    facilities: nyClubs,
    clubs: { "1": classesFor("1", 2), "2": classesFor("2", 2), "3": classesFor("3", 2) },
  });
  const s2 = await writeSnapshot(raw, {
    startedAt: "2026-10-04T23:00:00.000Z",
    facilities: nyClubs,
    clubs: { "1": classesFor("1", 3), "2": new Error("timeout"), "3": classesFor("3", 3) },
  });
  await writeSnapshot(raw, { startedAt: "2026-10-05T11:00:00.000Z", facilities: nyClubs, clubs: { "1": [], "2": [], "3": [] }, complete: false });

  const b = await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  assert.equal(b.snapshot, s2);
  assert.deepEqual(b.fallbacks, [{ id: "2", name: "Club 2", snapshot: s1 }]);
  assert.equal(b.totalClasses, 3 + 2 + 3);
  const index = await readJson<{ generatedAt: string }>(join(out, "index.json"));
  assert.equal(index.generatedAt, "2026-10-04T23:00:00.000Z");
  const club2 = await readJson<{ generatedAt: string }>(join(out, "clubs", "2.json"));
  assert.equal(club2.generatedAt, "2026-10-04T11:00:00.000Z");

  // --snapshot builds an older snapshot (and only looks further back from there).
  const old = await runBuild({ outDir: out, rawDir: raw, snapshot: s1, force: false, log: quiet });
  assert.equal(old.snapshot, s1);
  assert.equal(old.totalClasses, 6);
  assert.deepEqual(old.fallbacks, []);
  await assert.rejects(runBuild({ outDir: out, rawDir: raw, snapshot: "2026-10-05T11-00-00Z", force: false, log: quiet }), /incomplete/);
});

test("build: a --clubs subset snapshot composes with older snapshots", async () => {
  const out = await tempDir();
  const raw = join(out, "raw");
  const full = await writeSnapshot(raw, {
    startedAt: "2026-10-04T11:00:00.000Z",
    facilities: nyClubs,
    clubs: { "1": classesFor("1", 2), "2": classesFor("2", 2), "3": classesFor("3", 2) },
  });
  const subset = await writeSnapshot(raw, { startedAt: "2026-10-04T12:00:00.000Z", facilities: nyClubs, clubs: { "2": classesFor("2", 5) } });
  const b = await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  assert.equal(b.snapshot, subset);
  assert.equal(b.totalClasses, 2 + 5 + 2);
  assert.deepEqual(
    b.fallbacks.map((f) => [f.id, f.snapshot]),
    [
      ["1", full],
      ["3", full],
    ],
  );
});

test("build: publishes, then refuses a >50% drop and keeps the old files unless --force", async () => {
  const out = await tempDir();
  const raw = join(out, "raw");
  await writeSnapshot(raw, { startedAt: "2026-10-04T11:00:00.000Z", facilities: nyClubs, clubs: { "1": classesFor("1", 10), "2": classesFor("2", 10) } });
  assert.equal((await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet })).decision.publish, true);
  const index = await readFile(join(out, "index.json"), "utf8");
  const club1 = await readFile(join(out, "clubs", "1.json"), "utf8");

  await writeSnapshot(raw, { startedAt: "2026-10-04T23:00:00.000Z", facilities: nyClubs, clubs: { "1": classesFor("1", 4), "2": classesFor("2", 5) } });
  const refused = await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  assert.equal(refused.decision.publish, false);
  assert.equal(refused.prevTotal, 20);
  assert.equal(await readFile(join(out, "index.json"), "utf8"), index);
  assert.equal(await readFile(join(out, "clubs", "1.json"), "utf8"), club1);

  const forced = await runBuild({ outDir: out, rawDir: raw, force: true, log: quiet });
  assert.equal(forced.decision.publish, true);
  assert.equal(forced.totalClasses, 9);
});

test("build: removes club files of clubs that left the index, leaves other files alone", async () => {
  const out = await tempDir();
  const raw = join(out, "raw");
  await writeSnapshot(raw, { startedAt: "2026-10-04T11:00:00.000Z", facilities: nyClubs, clubs: { "1": classesFor("1", 10), "2": classesFor("2", 10) } });
  await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  await writeFile(join(out, "clubs", "notes.txt"), "keep me");
  const closed = nyClubs.map((f) => (f.facilityId === "2" ? { ...f, status: "Closed" } : f));
  await writeSnapshot(raw, { startedAt: "2026-10-04T23:00:00.000Z", facilities: closed, clubs: { "1": classesFor("1", 12) } });
  const b = await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  assert.deepEqual(b.files.removed, ["2.json"]);
  assert.deepEqual((await readdir(join(out, "clubs"))).sort(), ["1.json", "notes.txt"]);
});

test("build: fails clearly without a complete snapshot", async () => {
  const out = await tempDir();
  await assert.rejects(runBuild({ outDir: out, rawDir: join(out, "raw"), force: false, log: quiet }), /No complete snapshot/);
});

test("build: a snapshot whose facilities request failed uses the list it points to", async () => {
  const out = await tempDir();
  const raw = join(out, "raw");
  const s1 = await writeSnapshot(raw, { startedAt: "2026-10-04T11:00:00.000Z", facilities: nyClubs, clubs: { "1": classesFor("1", 1), "2": classesFor("2", 1), "3": classesFor("3", 1) } });
  await writeSnapshot(raw, { startedAt: "2026-10-04T23:00:00.000Z", facilities: null, facilitiesSource: s1, clubs: { "1": classesFor("1", 4), "2": classesFor("2", 4), "3": classesFor("3", 4) } });
  const b = await runBuild({ outDir: out, rawDir: raw, force: false, log: quiet });
  assert.equal(b.clubs, 3);
  assert.equal(b.totalClasses, 12);
});
