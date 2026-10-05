import { test } from "node:test";
import assert from "node:assert/strict";
import type { ClassItem } from "../../../../shared/schema.ts";
import type { ClubGroup } from "../catalog.ts";
import { catalog } from "../test-fixture.ts";
import { decodeFilters, encodeFilters, parseRanges } from "./codec.ts";
import { makeMatcher } from "./match.ts";
import { dayListLabel, shareSentence, whatSummary, whenSummary, whereSummary } from "./summary.ts";
import { EMPTY_FILTERS, type Filters } from "./types.ts";
import { allClasses, categoryState, clearWhat, isAnyClass, isNoClass, toggleCategory, toggleFamily } from "./what.ts";
import { EMPTY_MEMORY, addRange, removeRange, setDays, toggleDay, updateRange } from "./when.ts";
import { clearGroup, defaultCity, effectiveClubIds, groupAllPicked, pickTokens, selectGroup, toggleClub } from "./where.ts";

/** Defaults the app starts from: nothing chosen yet, any class. */
const base = (): Filters => allClasses(structuredClone(EMPTY_FILTERS), catalog);
const DOWNTOWN: ClubGroup = { key: "new-york-downtown", name: "Downtown", citySlug: "new-york", clubIds: ["112", "113"] };
const MIDTOWN: ClubGroup = { key: "new-york-midtown", name: "Midtown", citySlug: "new-york", clubIds: ["138"] };

// --- Where ---------------------------------------------------------------------------

test("picking clubs is the only selection: one tick, one club", () => {
  let f = toggleClub(base(), catalog, "138");
  assert.deepEqual(effectiveClubIds(f, catalog), ["138"]);
  f = toggleClub(f, catalog, "204"); // another city, same list
  assert.deepEqual(effectiveClubIds(f, catalog), ["138", "204"]);
  f = toggleClub(f, catalog, "138");
  assert.deepEqual(effectiveClubIds(f, catalog), ["204"]);
  assert.deepEqual(toggleClub(f, catalog, "nope"), f);
});

test("Select all picks a whole area explicitly; Clear unpicks just that area", () => {
  let f = toggleClub(base(), catalog, "204");
  f = selectGroup(f, catalog, DOWNTOWN);
  assert.ok(groupAllPicked(f, catalog, DOWNTOWN));
  assert.deepEqual(effectiveClubIds(f, catalog), ["112", "113", "204"]);
  f = toggleClub(f, catalog, "113");
  assert.ok(!groupAllPicked(f, catalog, DOWNTOWN));
  f = clearGroup(f, DOWNTOWN);
  assert.deepEqual(effectiveClubIds(f, catalog), ["204"]);
});

test("Your clubs: newest first, and a whole area is one token", () => {
  let f = toggleClub(base(), catalog, "204");
  f = selectGroup(f, catalog, DOWNTOWN);
  f = toggleClub(f, catalog, "138"); // Midtown has one club: stays a club token
  assert.deepEqual(
    pickTokens(f, catalog).map((t) => (t.kind === "group" ? `${t.group.key}·${t.count}` : t.id)),
    ["138", "new-york-downtown·2", "204"],
  );
  f = toggleClub(f, catalog, "113"); // Downtown no longer whole: its remaining club shows alone
  assert.deepEqual(pickTokens(f, catalog).map((t) => (t.kind === "club" ? t.id : t.group.key)), ["138", "112", "204"]);
});

test("the city shown first is where most picks are, else the biggest city", () => {
  assert.equal(defaultCity(base(), catalog).slug, "new-york");
  const boston = toggleClub(toggleClub(toggleClub(base(), catalog, "204"), catalog, "205"), catalog, "138");
  assert.equal(defaultCity(boston, catalog).slug, "boston");
});

// --- When ----------------------------------------------------------------------------

test("a new day copies the last touched day's ranges; a re-enabled day gets its own back", () => {
  let u = toggleDay(base(), EMPTY_MEMORY, 1); // Mon
  u = addRange(u.filters, u.memory, 1); // 6-9 AM
  u = toggleDay(u.filters, u.memory, 3); // Wed copies Mon
  assert.deepEqual(u.filters.ranges[3], [{ start: 360, end: 540 }]);
  u = updateRange(u.filters, u.memory, 3, 0, { start: 420, end: 540 }); // Wed 7-9, touched
  u = toggleDay(u.filters, u.memory, 5); // Fri copies Wed (last touched)
  assert.deepEqual(u.filters.ranges[5], [{ start: 420, end: 540 }]);
  u = updateRange(u.filters, u.memory, 1, 0, { start: 360, end: 480 }); // Mon 6-8, touched
  u = toggleDay(u.filters, u.memory, 6); // Sat copies Mon now
  assert.deepEqual(u.filters.ranges[6], [{ start: 360, end: 480 }]);
  u = toggleDay(u.filters, u.memory, 3); // Wed off (parked 7-9)
  u = toggleDay(u.filters, u.memory, 3); // Wed back: its own 7-9
  assert.deepEqual(u.filters.ranges[3], [{ start: 420, end: 540 }]);
});

test("+ adds the complementary range; removing the last range means any time", () => {
  let u = toggleDay(base(), EMPTY_MEMORY, 2);
  u = addRange(u.filters, u.memory, 2);
  u = addRange(u.filters, u.memory, 2);
  assert.deepEqual(u.filters.ranges[2], [
    { start: 360, end: 540 },
    { start: 1020, end: 1200 },
  ]);
  u = removeRange(u.filters, u.memory, 2, 0);
  u = removeRange(u.filters, u.memory, 2, 0);
  assert.deepEqual(u.filters.ranges[2], []);
});

test("shortcuts select exactly those days; the same shortcut again clears", () => {
  let u = setDays(base(), EMPTY_MEMORY, [1, 2, 3, 4, 5]);
  assert.deepEqual(u.filters.days, [1, 2, 3, 4, 5]);
  u = setDays(u.filters, u.memory, [1, 2, 3, 4, 5]);
  assert.deepEqual(u.filters.days, []);
});

// --- What ----------------------------------------------------------------------------

test("What starts as every category; All can be unticked down to nothing", () => {
  let f = base();
  assert.equal(isAnyClass(f, catalog), true);
  f = toggleCategory(f, catalog, 6); // untick all Cycling
  assert.equal(categoryState(f, catalog, 6), "off");
  f = toggleCategory(f, catalog, 104); // untick all Yoga
  assert.equal(isNoClass(f), true);
});

test("unticking one family of a whole category ticks the rest; ticking it back makes it whole again", () => {
  let f = toggleFamily(base(), catalog, "theme-ride");
  assert.equal(categoryState(f, catalog, 6), "mixed");
  assert.deepEqual(f.families, ["beats-ride"]);
  f = toggleFamily(f, catalog, "theme-ride");
  assert.equal(categoryState(f, catalog, 6), "on");
  assert.deepEqual(f.families, []);
});

test("from nothing, ticking a family selects only that family", () => {
  const f = toggleFamily(clearWhat(base()), catalog, "beats-ride");
  assert.deepEqual(f.categories, []);
  assert.deepEqual(f.families, ["beats-ride"]);
  assert.equal(categoryState(f, catalog, 6), "mixed");
});

// --- Matching ------------------------------------------------------------------------

const cls = (startLocal: string, family: string, cat: number): ClassItem => ({
  classInstanceId: 1,
  classId: 1,
  name: family,
  family,
  workoutCategoryId: cat,
  startLocal,
  endLocal: startLocal,
  startDate: new Date(`${startLocal}-04:00`).toISOString(),
  instructor: null,
  substitute: null,
  studioName: null,
  classLevel: null,
});

test("matching: days, ranges [start, end), whole categories and single families", () => {
  let u = toggleDay(clearWhat(base()), EMPTY_MEMORY, 1);
  u = addRange(u.filters, u.memory, 1); // Mon 6-9
  let f = toggleCategory(u.filters, catalog, 104); // all yoga
  f = toggleFamily(f, catalog, "beats-ride"); // + only beats ride
  const match = makeMatcher(f, catalog, Date.parse("2026-10-04T23:00:00Z"));
  assert.equal(match(cls("2026-10-05T06:00:00", "power-vinyasa", 104)), true);
  assert.equal(match(cls("2026-10-05T09:00:00", "power-vinyasa", 104)), false); // end is exclusive
  assert.equal(match(cls("2026-10-05T07:00:00", "beats-ride", 6)), true);
  assert.equal(match(cls("2026-10-05T07:00:00", "theme-ride", 6)), false);
  assert.equal(match(cls("2026-10-06T07:00:00", "beats-ride", 6)), false); // Tuesday
  assert.equal(match(cls("2026-10-04T07:00:00", "beats-ride", 6)), false); // already started
  assert.equal(makeMatcher(clearWhat(f), catalog, 0)(cls("2026-10-05T07:00:00", "beats-ride", 6)), false); // nothing ticked
});

// --- Codec ---------------------------------------------------------------------------

test("encode is canonical and decode round-trips", () => {
  let f = toggleClub(base(), catalog, "112");
  f = toggleClub(f, catalog, "138");
  f = selectGroup(f, catalog, { key: "boston", name: "Boston", citySlug: "boston", clubIds: ["204", "205"] });
  let u = setDays(f, EMPTY_MEMORY, [1, 3, 6]);
  u = addRange(u.filters, u.memory, 1);
  u = updateRange(u.filters, u.memory, 6, 0, { start: 540, end: 780 });
  f = toggleFamily(toggleCategory(clearWhat(u.filters), catalog, 104), catalog, "beats-ride");
  const q = encodeFilters(f, catalog);
  assert.equal(decodeFilters(q, catalog).dropped, 0);
  assert.equal(encodeFilters(decodeFilters(q, catalog).filters, catalog), q);
});

test("encode examples", () => {
  const ny = selectGroup(selectGroup(base(), catalog, DOWNTOWN), catalog, MIDTOWN);
  assert.equal(encodeFilters(ny, catalog), "city=new-york");
  const downtown = selectGroup(base(), catalog, DOWNTOWN);
  assert.equal(encodeFilters(downtown, catalog), "area=new-york-downtown");
  let u = setDays(toggleClub(base(), catalog, "112"), EMPTY_MEMORY, [1, 3, 6]);
  for (const d of [1, 3]) u = addRange(u.filters, u.memory, d);
  assert.equal(encodeFilters(u.filters, catalog), "club=greenwich-avenue&day=mo,we,sa&time=6-9&sa=any");
  const all7 = setDays(base(), EMPTY_MEMORY, [0, 1, 2, 3, 4, 5, 6]).filters;
  assert.equal(encodeFilters(all7, catalog), ""); // all days, any time, any class == defaults
  assert.equal(encodeFilters(toggleCategory(base(), catalog, 6), catalog), "cat=yoga");
});

test("decode: defaults to any class, drops unknown values and counts them", () => {
  const d = decodeFilters("?club=greenwich-avenue,gone-club&day=mo,xx&time=6:30-9&cat=yoga,juggling&class=nope", catalog);
  assert.equal(d.dropped, 3);
  assert.deepEqual(d.filters.clubs, ["112"]);
  assert.deepEqual(d.filters.ranges[1], [{ start: 390, end: 540 }]);
  assert.deepEqual(d.filters.categories, [104]);
  assert.equal(d.recognized, true);
  assert.equal(isAnyClass(decodeFilters("?club=soho", catalog).filters, catalog), true);
  assert.equal(decodeFilters("?utm_source=x", catalog).recognized, false);
  assert.deepEqual(parseRanges("6-9,bad,17:15-20"), [
    { start: 360, end: 540 },
    { start: 1035, end: 1200 },
  ]);
});

// --- Summaries -----------------------------------------------------------------------

test("day lists", () => {
  assert.equal(dayListLabel([1, 3, 6]), "Mon Wed Sat");
  assert.equal(dayListLabel([1, 2, 3, 4, 5]), "Weekdays");
  assert.equal(dayListLabel([0, 6]), "Weekends");
  assert.equal(dayListLabel([0, 5, 6]), "Fri–Sun");
  assert.equal(dayListLabel([1, 2, 3]), "Mon–Wed");
  assert.equal(dayListLabel([0, 1, 2, 3, 4, 5, 6]), "Every day");
});

test("filter-bar summaries and the share sentence", () => {
  let f = toggleClub(base(), catalog, "112");
  f = toggleClub(f, catalog, "138");
  let u = setDays(f, EMPTY_MEMORY, [1, 3, 6]);
  for (const d of [1, 3, 6]) u = addRange(u.filters, u.memory, d);
  f = toggleFamily(toggleCategory(clearWhat(u.filters), catalog, 104), catalog, "beats-ride");
  assert.deepEqual(whereSummary(f, catalog), { empty: false, line1: "Greenwich Ave", line2: "+ Hudson Yards" });
  assert.deepEqual(whenSummary(f), { empty: false, line1: "Mon Wed Sat", line2: "6–9 AM" });
  assert.deepEqual(whatSummary(f, catalog), { empty: false, line1: "All Yoga", line2: "+ Beats Ride" });
  assert.equal(
    shareSentence(f, catalog),
    "Equinox classes that fit: Yoga and Beats Ride at Greenwich Ave and Hudson Yards on Mon, Wed and Sat, 6–9 AM.",
  );
  assert.deepEqual(whereSummary(base(), catalog), { empty: true, action: true, line1: "Choose clubs", line2: "" });
  assert.deepEqual(whatSummary(base(), catalog), { empty: true, line1: "Any class", line2: "" });
  assert.equal(whatSummary(clearWhat(base()), catalog).line1, "No classes");
  const nyAll = selectGroup(selectGroup(base(), catalog, DOWNTOWN), catalog, MIDTOWN);
  assert.deepEqual(whereSummary(nyAll, catalog), { empty: false, line1: "New York", line2: "All 3 clubs" });
  assert.equal(shareSentence(selectGroup(base(), catalog, DOWNTOWN), catalog), "Equinox classes that fit: New York (Downtown).");
});
