import assert from "node:assert/strict";
import { test } from "node:test";
import type { RawClass } from "../apis/types.ts";
import { SCHEMA_VERSION } from "../shared/schema.ts";
import { buildDataset, prepareClub, type PreparedClub } from "./build.ts";
import { at, facility, rawClass } from "./testing.ts";

const london = {
  region: "London",
  subRegion: null,
  timeZone: "GMT Standard Time",
  facilityContact: { address: "1 High Street", city: "London", state: null, zip: null, country: "GB", latitude: "51.5", longitude: "-0.19", phoneNumber: null },
};

const facilities = [
  facility({ facilityId: "112", name: "Equinox Greenwich Avenue", webName: "Greenwich Avenue", shortName: "Greenwich Ave" }),
  facility({ facilityId: "138", name: "Equinox Hudson Yards", webName: "Hudson Yards", region: "New York/Midtown", subRegion: "Midtown" }),
  facility({ facilityId: "871", name: "Equinox Kensington", webName: "Kensington", ...london }),
  facility({ facilityId: "874", name: "Equinox Shoreditch", webName: "Shoreditch", ...london }),
  facility({ facilityId: "999", name: "Equinox Coming Soon", webName: "Coming Soon", status: "ComingSoon" }),
  facility({ facilityId: "555", name: "Equinox Never Fetched", webName: "Never Fetched" }),
];

const NOW = { name: "2026-10-04T23-00-00Z", startedAt: "2026-10-04T23:00:00.000Z" };
const OLDER = { snapshot: "2026-10-04T11-00-00Z", fetchedAt: "2026-10-04T11:00:00.000Z" };
const nyRange = { start: "2026-10-04", end: "2026-11-14" };
const londonRange = { start: "2026-10-05", end: "2026-11-15" };

function prep(id: string, raws: RawClass[], range = nyRange, source = { snapshot: NOW.name, fetchedAt: NOW.startedAt }): [string, PreparedClub] {
  return [id, prepareClub(raws, id, { ...source, range })];
}

const clubs = new Map([
  prep("112", [
    rawClass({ classInstanceId: 1, classId: 10, name: "Vinyasa Yoga", classDescription: "Flow.", ...at("2026-10-04T08:45") }),
    rawClass({ classInstanceId: 2, classId: 20, name: "THEME RIDE: Pink", workoutCategoryId: 6, ...at("2026-10-31T09:00") }),
    rawClass({ classInstanceId: 2, classId: 20, name: "THEME RIDE: Pink", workoutCategoryId: 6, ...at("2026-10-31T09:00") }),
  ]),
  // From an older snapshot (its fetch failed in the newest one).
  prep("138", [rawClass({ classInstanceId: 3, classId: 10, name: "Vinyasa Yoga", classDescription: "Flow.", ...at("2026-10-05T07:00") }, "138")], nyRange, OLDER),
  prep("871", [rawClass({ classInstanceId: 4, classId: 30, name: "THEME RIDE: Disco", workoutCategoryId: 6, ...at("2026-10-05T18:00", 1) }, "871")], londonRange),
  prep("874", [], londonRange),
  prep("999", [rawClass({ classInstanceId: 5 }, "999")]),
]);

const ds = buildDataset({ facilities, clubs, snapshot: NOW });

test("index lists open clubs with data, in display order, including ones with no classes", () => {
  assert.equal(ds.index.version, SCHEMA_VERSION);
  assert.equal(ds.index.generatedAt, NOW.startedAt);
  assert.deepEqual(
    ds.index.clubs.map((c) => [c.id, c.area, c.town, c.classCount, c.firstDate, c.lastDate]),
    [
      // London and New York both have 2 clubs: ties go alphabetically.
      ["871", null, "London", 1, "2026-10-05", "2026-10-05"],
      ["874", null, "London", 0, null, null],
      ["112", "new-york-downtown", "New York", 2, "2026-10-04", "2026-10-31"],
      ["138", "new-york-midtown", "New York", 1, "2026-10-05", "2026-10-05"],
    ],
  );
  assert.equal(ds.totalClasses, 4);
  assert.deepEqual(ds.index.horizon, { start: "2026-10-04", end: "2026-10-31" });
});

test("cities (with areas only where Equinox has sub-regions) and categories", () => {
  assert.deepEqual(ds.index.cities, [
    {
      slug: "london",
      name: "London",
      areas: [],
      clubIds: ["871", "874"],
    },
    {
      slug: "new-york",
      name: "New York",
      areas: [
        { slug: "new-york-downtown", name: "Downtown", clubIds: ["112"] },
        { slug: "new-york-midtown", name: "Midtown", clubIds: ["138"] },
      ],
      clubIds: ["112", "138"],
    },
  ]);
  assert.deepEqual(
    ds.index.categories.map((c) => c.slug),
    ["cycling", "yoga"],
  );
});

test("families span clubs", () => {
  assert.deepEqual(
    ds.index.families.map((f) => [f.key, f.count, f.clubCount, f.categoryId, f.variants]),
    [
      ["theme-ride", 2, 2, 6, ["THEME RIDE: Disco", "THEME RIDE: Pink"]],
      ["vinyasa-yoga", 2, 2, 104, ["Vinyasa Yoga"]],
    ],
  );
});

test("club schedules: requested range, data time, sorted classes, descriptions", () => {
  const s112 = ds.schedules.find((s) => s.clubId === "112");
  assert.ok(s112);
  assert.equal(s112.version, SCHEMA_VERSION);
  assert.equal(s112.generatedAt, NOW.startedAt);
  assert.equal(s112.timeZone, "America/New_York");
  assert.deepEqual(s112.range, nyRange);
  assert.deepEqual(
    s112.classes.map((c) => [c.classInstanceId, c.family, c.startLocal]),
    [
      [1, "vinyasa-yoga", "2026-10-04T08:45:00"],
      [2, "theme-ride", "2026-10-31T09:00:00"],
    ],
  );
  assert.deepEqual(s112.descriptions, { "10": "Flow.", "20": "Flowing sequences." });
  // A fallback club's file carries the older snapshot's time.
  assert.equal(ds.schedules.find((s) => s.clubId === "138")?.generatedAt, OLDER.fetchedAt);
  const s871 = ds.schedules.find((s) => s.clubId === "871");
  assert.equal(s871?.timeZone, "Europe/London");
  assert.equal(s871?.classes[0].startLocal, "2026-10-05T18:00:00");
  assert.equal(s871?.classes[0].startDate, "2026-10-05T17:00:00.000Z");
  assert.deepEqual(ds.schedules.find((s) => s.clubId === "874")?.classes, []);
});

test("fallbacks and warnings", () => {
  assert.deepEqual(ds.fallbacks, [{ id: "138", name: "Hudson Yards", snapshot: OLDER.snapshot }]);
  assert.equal(ds.warnings.length, 2, ds.warnings.join("\n"));
  assert.match(ds.warnings.join("\n"), /1 open clubs have never been fetched.*555/);
  assert.match(ds.warnings.join("\n"), /club 112 .*1 duplicate/);
});

test("report is built from the same classes", () => {
  assert.equal(ds.report.totals.classes, 4);
  assert.deepEqual(
    ds.report.prefixes.map((p) => [p.prefix, p.variantCount, p.collapsedTo]),
    [["THEME RIDE", 2, "Theme Ride"]],
  );
});

test("duplicate club slugs abort the build", () => {
  const dupes = [facility({ facilityId: "1", webName: "SoHo" }), facility({ facilityId: "2", webName: "Soho" })];
  assert.throws(() => buildDataset({ facilities: dupes, clubs: new Map([prep("1", []), prep("2", [])]), snapshot: NOW }), /Duplicate club slugs/);
});
