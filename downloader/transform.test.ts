import assert from "node:assert/strict";
import { test } from "node:test";
import type { RawFacility } from "../apis/types.ts";
import type { ClassItem } from "../shared/schema.ts";
import { at, facility, rawClass } from "./testing.ts";
import {
  assertUniqueSlugs,
  buildCategories,
  buildCities,
  buildFamilies,
  clubFromFacility,
  clubStats,
  descriptionsOf,
  horizonOf,
  personName,
  placeOf,
  toClassItem,
  transformClubClasses,
} from "./transform.ts";

const noStats = { classCount: 0, firstDate: null, lastDate: null };
const withTown = (f: RawFacility, city: string | null) => ({ ...f, facilityContact: { ...f.facilityContact!, city } });

// --- places -------------------------------------------------------------------

test("placeOf: region 'City/Area' gives a city and an official area", () => {
  assert.deepEqual(placeOf(facility({ facilityId: "112", region: "New York/Downtown", subRegion: "Downtown" })), {
    city: { name: "New York", slug: "new-york" },
    area: { name: "Downtown", slug: "new-york-downtown" },
    town: "New York",
  });
  const valley = placeOf(withTown(facility({ facilityId: "709", region: "Southern California/The Valley", subRegion: "The Valley" }), "Studio City"));
  assert.deepEqual(valley, {
    city: { name: "Southern California", slug: "southern-california" },
    area: { name: "The Valley", slug: "southern-california-the-valley" },
    town: "Studio City",
  });
});

test("placeOf: Canada/Washington/Pennsylvania regions name the city, which then has no areas", () => {
  for (const [region, city] of [
    ["Canada/Toronto", "Toronto"],
    ["Canada/Vancouver", "Vancouver"],
    ["Washington/Seattle", "Seattle"],
    ["Pennsylvania/Philadelphia", "Philadelphia"],
  ]) {
    const p = placeOf(facility({ facilityId: "1", region, subRegion: city }));
    assert.equal(p.city.name, city, region);
    assert.equal(p.area, null, region);
  }
});

test("placeOf: single-name regions have no area; town comes from the address", () => {
  const dc = placeOf(withTown(facility({ facilityId: "252", region: "Washington DC", subRegion: null }), "Bethesda"));
  assert.deepEqual(dc, { city: { name: "Washington DC", slug: "washington-dc" }, area: null, town: "Bethesda" });
  const miami = placeOf(withTown(facility({ facilityId: "301", region: "Florida", subRegion: null }), "Miami Beach"));
  assert.deepEqual(miami, { city: { name: "Florida", slug: "florida" }, area: null, town: "Miami Beach" });
  // A subRegion that just repeats the city is not an area.
  assert.equal(placeOf(facility({ facilityId: "1", region: "Chicago", subRegion: "Chicago" })).area, null);
});

test("placeOf: missing region falls back to the address city, then 'Other'", () => {
  assert.equal(placeOf(facility({ facilityId: "1", region: null, subRegion: null })).city.name, "New York");
  const bare = placeOf(facility({ facilityId: "1", region: null, subRegion: null, facilityContact: null }));
  assert.deepEqual(bare, { city: { name: "Other", slug: "other" }, area: null, town: null });
});

// --- clubs ----------------------------------------------------------------------

test("clubFromFacility maps names, slug, place, zone, coordinates and stats", () => {
  const f = facility({ facilityId: "112", name: "Equinox Greenwich Avenue", webName: "Greenwich Avenue", shortName: "Greenwich Ave" });
  assert.deepEqual(clubFromFacility(f, { classCount: 3, firstDate: "2026-10-04", lastDate: "2026-10-31" }), {
    id: "112",
    slug: "greenwich-avenue",
    name: "Greenwich Avenue",
    fullName: "Equinox Greenwich Avenue",
    shortName: "Greenwich Ave",
    city: "new-york",
    area: "new-york-downtown",
    town: "New York",
    timeZone: "America/New_York",
    clubType: "Regular",
    address: "1 Main Street",
    lat: 40.7375,
    lon: -74.002,
    classCount: 3,
    firstDate: "2026-10-04",
    lastDate: "2026-10-31",
  });
});

test("clubFromFacility fallbacks: no webName, branded shortName, blank address and coordinates, London", () => {
  const f = facility({
    facilityId: "874",
    name: "Equinox Shoreditch",
    webName: null,
    shortName: "Equinox Shoreditch",
    clubType: null,
    region: "London",
    subRegion: null,
    timeZone: "GMT Standard Time",
  });
  f.facilityContact = { ...f.facilityContact!, city: "London", latitude: "", longitude: null, address: "  " };
  const club = clubFromFacility(f, noStats);
  assert.equal(club.name, "Shoreditch");
  assert.equal(club.slug, "shoreditch");
  assert.equal(club.shortName, "Shoreditch");
  assert.equal(club.fullName, "Equinox Shoreditch");
  assert.equal(club.city, "london");
  assert.equal(club.area, null);
  assert.equal(club.town, "London");
  assert.equal(club.timeZone, "Europe/London");
  assert.equal(club.clubType, null);
  assert.equal(club.address, null);
  assert.equal(club.lat, null);
  assert.equal(club.lon, null);
});

test("club slugs: punctuation is slugified; duplicates throw", () => {
  assert.equal(clubFromFacility(facility({ facilityId: "873", webName: "E St. James's" }), noStats).slug, "e-st-james-s");
  const a = clubFromFacility(facility({ facilityId: "1", webName: "Soho" }), noStats);
  const b = clubFromFacility(facility({ facilityId: "2", webName: "SoHo" }), noStats);
  assert.throws(() => assertUniqueSlugs([a, b]), /Duplicate club slugs.*"soho"/);
});

test("buildCities: cities by size; areas by size then name; clubs by numeric-aware name; area-less clubs last", () => {
  const ny = (id: string, webName: string, area: string | null) =>
    facility({ facilityId: id, webName, region: area ? `New York/${area}` : "New York", subRegion: area });
  const fl = (id: string, webName: string, town: string) => withTown(facility({ facilityId: id, webName, region: "Florida", subRegion: null }), town);
  const facilities = [
    ny("1", "West 92nd Street", "Uptown"),
    ny("2", "Greenwich Avenue", "Downtown"),
    ny("3", "East 53rd Street", "Midtown"),
    ny("4", "East 43rd Street", "Midtown"),
    ny("5", "Wall Street", "Downtown"),
    ny("6", "Tribeca", "Downtown"),
    ny("7", "Columbus Circle", "Uptown"),
    ny("8", "Mystery", null),
    fl("10", "South Beach", "Miami Beach"),
    fl("11", "Aventura", "Aventura"),
    fl("12", "Brickell", "Miami"),
    facility({ facilityId: "9", webName: "Kensington", region: "London", subRegion: null }),
  ];
  const { cities, clubs } = buildCities(facilities.map((f) => ({ club: clubFromFacility(f, noStats), place: placeOf(f) })));
  assert.deepEqual(cities, [
    {
      slug: "new-york",
      name: "New York",
      areas: [
        { slug: "new-york-downtown", name: "Downtown", clubIds: ["2", "6", "5"] },
        { slug: "new-york-midtown", name: "Midtown", clubIds: ["4", "3"] },
        { slug: "new-york-uptown", name: "Uptown", clubIds: ["7", "1"] },
      ],
      clubIds: ["2", "6", "5", "4", "3", "7", "1", "8"],
    },
    { slug: "florida", name: "Florida", areas: [], clubIds: ["11", "12", "10"] },
    { slug: "london", name: "London", areas: [], clubIds: ["9"] },
  ]);
  assert.deepEqual(
    clubs.map((c) => c.id),
    ["2", "6", "5", "4", "3", "7", "1", "8", "11", "12", "10", "9"],
  );
  assert.equal(clubs.find((c) => c.id === "8")?.area, null);
  assert.equal(clubs.find((c) => c.id === "10")?.town, "Miami Beach");
});

// --- classes ------------------------------------------------------------------

test("personName trims and tolerates empty or missing parts", () => {
  assert.equal(personName({ id: 1, firstName: " Jamison ", lastName: "Goodnight" }), "Jamison Goodnight");
  assert.equal(personName({ id: 1, firstName: "Moedizzy", lastName: "" }), "Moedizzy");
  assert.equal(personName({ id: 1, firstName: "CJ", lastName: " " }), "CJ");
  assert.equal(personName({ id: 1, firstName: null, lastName: "Smith" }), "Smith");
  assert.equal(personName({ id: 1, firstName: " ", lastName: null }), null);
  assert.equal(personName(null), null);
});

test("toClassItem keeps the API's field names and formats", () => {
  const item = toClassItem(
    rawClass({
      classInstanceId: 12293216,
      classId: 1238,
      name: "  Vinyasa   Yoga ",
      ...at("2026-10-04T08:45"),
      instructors: [
        { instructor: { id: 1, firstName: "Michaela", lastName: "McGowan" }, substitute: { id: 2, firstName: "Moedizzy", lastName: "" } },
      ],
      studioName: " Yoga Studio ",
      classLevel: { classLevelID: 0, content: "All Levels Welcome" },
      label: { name: "Updated", type: "Updated", color: "#AAAAAA" },
    }),
  );
  assert.deepEqual(item, {
    classInstanceId: 12293216,
    classId: 1238,
    name: "Vinyasa Yoga",
    family: "vinyasa-yoga",
    workoutCategoryId: 104,
    startLocal: "2026-10-04T08:45:00",
    endLocal: "2026-10-04T09:30:00",
    startDate: "2026-10-04T12:45:00.000Z",
    instructor: "Michaela McGowan",
    substitute: "Moedizzy",
    studioName: "Yoga Studio",
    classLevel: "All Levels Welcome",
    label: "Updated",
  });
});

test("toClassItem: optional fields only when meaningful", () => {
  const plain = toClassItem(rawClass());
  assert.equal("isCancelled" in plain, false);
  assert.equal("label" in plain, false);
  assert.equal(plain.substitute, null);

  assert.equal(toClassItem(rawClass({ status: { ...rawClass().status!, isCancelled: true } })).isCancelled, true);
  assert.equal(toClassItem(rawClass({ label: { name: "New", type: "New", color: "#AAAAAA" } })).label, "New");
  // Labels outside the schema ("Special_Event") are dropped.
  assert.equal("label" in toClassItem(rawClass({ label: { name: "Special_Event", type: "Event", color: "#9584FF" } })), false);

  const bare = toClassItem(rawClass({ instructors: null, studioName: null, classLevel: null, status: null }));
  assert.equal(bare.instructor, null);
  assert.equal(bare.substitute, null);
  assert.equal(bare.studioName, null);
  assert.equal(bare.classLevel, null);
  assert.equal("isCancelled" in bare, false);

  const subOnly = toClassItem(rawClass({ instructors: [{ instructor: null, substitute: { id: 3, firstName: "Ana", lastName: "Li" } }] }));
  assert.equal(subOnly.instructor, null);
  assert.equal(subOnly.substitute, "Ana Li");
});

test("toClassItem: co-taught classes list both instructors in a stable order", () => {
  const geoff = { id: 1, firstName: "Geoff", lastName: "Bagshaw" };
  const sara = { id: 2, firstName: "Sara", lastName: "Cathcart" };
  const a = toClassItem(rawClass({ instructors: [{ instructor: sara, substitute: null }, { instructor: geoff, substitute: null }] }));
  const b = toClassItem(rawClass({ instructors: [{ instructor: geoff, substitute: null }, { instructor: sara, substitute: null }] }));
  assert.equal(a.instructor, "Geoff Bagshaw & Sara Cathcart");
  assert.equal(b.instructor, a.instructor);
});

test("toClassItem: family follows shared/families.ts (THEME RIDE collapses, marks stripped)", () => {
  assert.equal(toClassItem(rawClass({ name: "THEME RIDE: Charli XCX x Rufus Du Sol" })).family, "theme-ride");
  assert.equal(toClassItem(rawClass({ name: "THEME RIDE: " })).family, "theme-ride");
  assert.equal(toClassItem(rawClass({ name: "Precision Run®" })).family, "precision-run");
  assert.equal(toClassItem(rawClass({ name: "Precision Run®" })).name, "Precision Run®");
  assert.equal(toClassItem(rawClass({ name: "Rounds: Boxing" })).family, "rounds-boxing");
});

test("transformClubClasses dedupes, drops foreign/invalid rows and sorts by startLocal then name", () => {
  const raws = [
    rawClass({ classInstanceId: 3, name: "Stronger", ...at("2026-10-05T07:00") }),
    rawClass({ classInstanceId: 1, name: "Vinyasa Yoga", ...at("2026-10-04T08:45") }),
    rawClass({ classInstanceId: 2, name: "Beats Ride", ...at("2026-10-04T08:45") }),
    rawClass({ classInstanceId: 1, name: "Vinyasa Yoga", ...at("2026-10-04T08:45") }), // duplicate
    rawClass({ classInstanceId: 4 }, "138"), // another club's class
    rawClass({ classInstanceId: 5, name: "   " }), // unusable
    rawClass({ classInstanceId: 6, startLocal: "soon" }), // unusable
  ];
  const r = transformClubClasses(raws, "112");
  assert.deepEqual(
    r.classes.map((c) => [c.classInstanceId, c.startLocal, c.name]),
    [
      [2, "2026-10-04T08:45:00", "Beats Ride"],
      [1, "2026-10-04T08:45:00", "Vinyasa Yoga"],
      [3, "2026-10-05T07:00:00", "Stronger"],
    ],
  );
  assert.equal(r.duplicates, 1);
  assert.equal(r.foreign, 1);
  assert.equal(r.invalid, 2);
});

test("transformClubClasses reports Special_Event ids for the report", () => {
  const r = transformClubClasses(
    [rawClass({ classInstanceId: 7, label: { name: "Special_Event", type: "Event", color: "#9584FF" } }), rawClass({ classInstanceId: 8 })],
    "112",
  );
  assert.deepEqual([...r.specialEventIds], [7]);
});

test("descriptionsOf: trimmed, most common per classId, empty ones skipped", () => {
  const d = descriptionsOf([
    rawClass({ classId: 1, classDescription: " Flow. " }),
    rawClass({ classId: 1, classDescription: "Flow." }),
    rawClass({ classId: 1, classDescription: "Old copy." }),
    rawClass({ classId: 2, classDescription: "" }),
    rawClass({ classId: 3, classDescription: null }),
    rawClass({ classId: 4, classDescription: "B" }),
    rawClass({ classId: 4, classDescription: "A" }), // tie -> alphabetical
  ]);
  assert.deepEqual(d, { "1": "Flow.", "4": "A" });
});

test("transformClubClasses: descriptions only cover classIds that made it into classes", () => {
  const r = transformClubClasses(
    [rawClass({ classId: 10, classDescription: "Kept." }), rawClass({ classId: 11, classDescription: "Other club." }, "138")],
    "112",
  );
  assert.deepEqual(r.descriptions, { "10": "Kept." });
});

test("clubStats / horizonOf", () => {
  const classes = [
    toClassItem(rawClass(at("2026-10-05T07:00"))),
    toClassItem(rawClass(at("2026-10-31T18:00"))),
    toClassItem(rawClass(at("2026-10-04T08:45"))),
  ];
  assert.deepEqual(clubStats(classes), { classCount: 3, firstDate: "2026-10-04", lastDate: "2026-10-31" });
  assert.deepEqual(clubStats([]), noStats);
  assert.deepEqual(
    horizonOf(
      [
        { firstDate: "2026-10-05", lastDate: "2026-10-31" },
        { firstDate: null, lastDate: null },
        { firstDate: "2026-10-04", lastDate: "2026-10-30" },
      ],
      [],
    ),
    { start: "2026-10-04", end: "2026-10-31" },
  );
  assert.deepEqual(horizonOf([{ firstDate: null, lastDate: null }], [{ start: "2026-10-04", end: "2026-11-14" }]), {
    start: "2026-10-04",
    end: "2026-11-14",
  });
});

// --- index-wide aggregates ----------------------------------------------------

test("buildCategories: only present categories, Equinox order, unknown ids as Other", () => {
  const warnings: string[] = [];
  const cats = buildCategories([104, 6, 6, 999, 2], (w) => warnings.push(w));
  assert.deepEqual(cats, [
    { id: 6, name: "Cycling", slug: "cycling" },
    { id: 104, name: "Yoga", slug: "yoga" },
    { id: 2, name: "Boxing", slug: "boxing" },
    { id: 999, name: "Other", slug: "other-999" },
  ]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /999/);
});

test("buildFamilies aggregates by family key", () => {
  const item = (name: string, cat: number) => toClassItem(rawClass({ name, workoutCategoryId: cat }));
  const clubA: ClassItem[] = [
    item("THEME RIDE: Taylor Swift", 6),
    item("THEME RIDE: Taylor Swift", 6),
    item("Theme Ride: Pink", 6),
    item("Precision Run®", 202),
    item("Precision Run", 202),
    item("Vinyasa Yoga", 104),
  ];
  const clubB: ClassItem[] = [item("THEME RIDE: Disco House", 5), item("Precision Run®", 202), item("Precision Run®", 213)];
  assert.deepEqual(
    buildFamilies([
      { clubId: "1", classes: clubA },
      { clubId: "2", classes: clubB },
    ]),
    [
      { key: "precision-run", name: "Precision Run", categoryId: 202, count: 4, clubCount: 2, variants: ["Precision Run"] },
      {
        key: "theme-ride",
        name: "Theme Ride",
        categoryId: 6,
        count: 4,
        clubCount: 2,
        variants: ["THEME RIDE: Taylor Swift", "THEME RIDE: Disco House", "Theme Ride: Pink"],
      },
      { key: "vinyasa-yoga", name: "Vinyasa Yoga", categoryId: 104, count: 1, clubCount: 1, variants: ["Vinyasa Yoga"] },
    ],
  );
});
