import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClassNameReport, renderClassNameReportMarkdown } from "./report.ts";
import { at, rawClass } from "./testing.ts";
import { toClassItem } from "./transform.ts";

const person = (firstName: string) => ({ id: 0, firstName, lastName: "X" });
const cls = (name: string, start: string, teacher: string, sub?: string, id?: number) =>
  toClassItem(
    rawClass({
      name,
      ...at(start),
      ...(id !== undefined && { classInstanceId: id }),
      instructors: [{ instructor: person(teacher), substitute: sub ? person(sub) : null }],
    }),
  );

const report = buildClassNameReport(
  [
    {
      clubId: "112",
      clubName: "Greenwich Avenue",
      classes: [
        cls("Rounds: Boxing", "2026-10-04T09:30", "Bryan"),
        cls("Rounds: Boxing", "2026-10-11T09:30", "Bryan", "Kim"),
        cls("Rounds: Boxing", "2026-10-18T09:30", "Bryan"),
        cls("THEME RIDE: Taylor Swift", "2026-10-06T07:00", "Ana", undefined, 900),
        cls("Vinyasa Yoga", "2026-10-04T08:45", "Liz"),
      ],
      specialEventIds: new Set([900]),
    },
    {
      clubId: "138",
      clubName: "Hudson Yards",
      classes: [cls("Rounds: Boxing", "2026-10-05T18:00", "Joe"), cls("Theme Ride: Taylor Swift®", "2026-10-07T07:00", "Ana"), cls("THEME RIDE: Pink", "2026-10-30T07:00", "Ana")],
    },
  ],
  (id) => (id === 104 ? "Yoga" : `cat ${id}`),
  "2026-10-05T00:00:00.000Z",
  { start: "2026-10-04", end: "2026-10-31" },
);

test("prefixes group case-insensitively and are sorted by variant count", () => {
  assert.deepEqual(
    report.prefixes.map((p) => [p.prefix, p.variantCount, p.count, p.clubCount, p.oneWeekVariants, p.oneClubVariants, p.collapsedTo, p.specialEvent]),
    [
      ["THEME RIDE", 2, 3, 2, 2, 1, "Theme Ride", 1],
      ["Rounds", 1, 4, 2, 0, 0, null, 0],
    ],
  );
  assert.deepEqual(report.prefixes[0].spellings, ["Theme Ride"]);
});

test("variant stats: clubs, teachers (subs count), weeks, spellings, examples", () => {
  const boxing = report.prefixes[1].variants[0];
  assert.equal(boxing.name, "Rounds: Boxing");
  assert.equal(boxing.variant, "Boxing");
  assert.equal(boxing.count, 4);
  assert.equal(boxing.clubCount, 2);
  assert.equal(boxing.instructorCount, 3); // Bryan, Kim (sub), Joe
  assert.deepEqual(boxing.weeks, ["2026-10-04", "2026-10-11", "2026-10-18"]);
  assert.equal(boxing.weekCount, 3);
  assert.deepEqual(boxing.exampleClubs, ["Greenwich Avenue", "Hudson Yards"]);

  const taylor = report.prefixes[0].variants[0];
  assert.equal(taylor.name, "THEME RIDE: Taylor Swift");
  assert.deepEqual(taylor.spellings, ["Theme Ride: Taylor Swift"]);
  assert.equal(taylor.count, 2);
  assert.equal(taylor.weekCount, 1);
  assert.equal(taylor.specialEvent, 1);
});

test("names list every distinct published name with category and family", () => {
  assert.equal(report.totals.classes, 8);
  assert.equal(report.totals.distinctNames, 5);
  assert.deepEqual(report.names[0], {
    name: "Rounds: Boxing",
    count: 4,
    clubCount: 2,
    categoryId: 104,
    category: "Yoga",
    family: "rounds-boxing",
    prefix: "Rounds",
    specialEvent: 0,
  });
  assert.equal(report.names.find((n) => n.name === "Vinyasa Yoga")?.prefix, null);
  assert.deepEqual(report.weeks, ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"]);
});

test("markdown summary has one row per prefix", () => {
  const md = renderClassNameReportMarkdown(report);
  assert.match(md, /^# Class-name prefixes/);
  assert.match(md, /\| THEME RIDE \| 2 \| 3 \| 2 \| 2 \| 1 \| 1 \| Theme Ride \| Taylor Swift 2\/2\/1; Pink 1\/1\/1 \|/);
  assert.match(md, /\| Rounds \| 1 \| 4 \| 2 \| 0 \| 0 \| 0 \|  \| Boxing 4\/2\/3 \|/);
});
