import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog } from "./catalog.ts";
import { searchClubs } from "./clubSearch.ts";
import { INDEX } from "./test-fixture.ts";

// The fixture, plus towns and one club with nothing on the schedule.
const catalog = buildCatalog({
  ...INDEX,
  clubs: INDEX.clubs.map((c) =>
    c.id === "113" ? { ...c, town: "Greenvale" } : c.id === "205" ? { ...c, town: "Chestnut Hill" } : c.id === "138" ? { ...c, classCount: 0 } : c,
  ),
});
const names = (q: string) => searchClubs(catalog, q, []).hits.map((h) => h.club.name);

test("names that start with the query come first; a town match shows the town", () => {
  const { hits } = searchClubs(catalog, "green", []);
  assert.deepEqual(hits.map((h) => h.club.name), ["Greenwich Ave", "SoHo"]);
  assert.equal(hits[1].place, "Greenvale · New York · Downtown");
});

test("words match at their start, not in the middle", () => {
  assert.deepEqual(names("hill"), ["Chestnut Hill"]);
  assert.deepEqual(names("ill"), []);
});

test("a town already in the name isn't repeated", () => {
  assert.equal(searchClubs(catalog, "chestnut", []).hits[0].place, "Boston");
});

test("shorthand for places works", () => {
  assert.deepEqual(names("nyc"), ["Greenwich Ave", "SoHo"]);
});

test("clubs with no classes are reported, not offered (unless already picked)", () => {
  const r = searchClubs(catalog, "hudson", []);
  assert.deepEqual(r.hits, []);
  assert.deepEqual(r.withoutClasses.map((c) => c.name), ["Hudson Yards"]);
  assert.deepEqual(searchClubs(catalog, "hudson", ["138"]).hits.map((h) => h.club.name), ["Hudson Yards"]);
});
