import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dayOfWeek, daysBetween, isLocalDate, todayIn, weekStart } from "./dates.ts";

test("todayIn picks the club-local calendar date", () => {
  const now = new Date("2026-10-04T23:30:00Z"); // Sun 19:30 in New York, Mon 00:30 in London
  assert.equal(todayIn("America/New_York", now), "2026-10-04");
  assert.equal(todayIn("America/Los_Angeles", now), "2026-10-04");
  assert.equal(todayIn("Europe/London", now), "2026-10-05");
  assert.equal(todayIn("America/Los_Angeles", new Date("2026-10-05T06:59:59Z")), "2026-10-04");
  assert.equal(todayIn("America/Los_Angeles", new Date("2026-10-05T07:00:00Z")), "2026-10-05");
  // After the UK leaves BST (2026-10-25), London midnight is 00:00 UTC.
  assert.equal(todayIn("Europe/London", new Date("2026-10-25T23:30:00Z")), "2026-10-25");
});

test("addDays / daysBetween are DST- and month-safe", () => {
  assert.equal(addDays("2026-10-04", 27), "2026-10-31");
  assert.equal(addDays("2026-10-04", 42), "2026-11-15");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01"); // US DST ends 2026-11-01
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(daysBetween("2026-10-04", "2026-11-15"), 42);
  assert.equal(daysBetween("2026-11-15", "2026-10-04"), -42);
  assert.equal(daysBetween("2026-10-25", "2026-11-02"), 8); // across both DST changes
});

test("dayOfWeek / weekStart use Sunday-Saturday weeks", () => {
  assert.equal(dayOfWeek("2026-10-04"), 0);
  assert.equal(dayOfWeek("2026-10-31"), 6);
  assert.equal(weekStart("2026-10-04"), "2026-10-04");
  assert.equal(weekStart("2026-10-31"), "2026-10-25");
  assert.equal(weekStart("2026-11-02"), "2026-11-01");
});

test("isLocalDate rejects malformed and impossible dates", () => {
  assert.equal(isLocalDate("2026-10-04"), true);
  assert.equal(isLocalDate("2026-02-30"), false);
  assert.equal(isLocalDate("2026-10-4"), false);
  assert.equal(isLocalDate("2026-10-04T00:00"), false);
  assert.throws(() => addDays("10/04/2026", 1));
});
