import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingOpensAt, bookingOpensAtWallClock, bookingWindow } from "./booking.ts";

const NY = "America/New_York";
const local = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone, dateStyle: "short", timeStyle: "short" }).format(d);

test("opens 26 hours before start", () => {
  // Tue Oct 6 2026, 1:00 PM EDT -> Mon 11:00 AM
  assert.equal(local(bookingOpensAt("2026-10-06T17:00:00.000Z", NY), NY), "2026-10-05 11:00");
});

test("an opening inside the 2-5 AM closure moves to 5:00 AM", () => {
  // 6:15 AM class -> 26 h before is 4:15 AM -> closed -> 5:00 AM
  assert.equal(local(bookingOpensAt("2026-10-06T10:15:00.000Z", NY), NY), "2026-10-05 05:00");
  // 4:00 AM class -> 2:00 AM -> 5:00 AM
  assert.equal(local(bookingOpensAt("2026-10-06T08:00:00.000Z", NY), NY), "2026-10-05 05:00");
});

test("5:00 AM itself is open, 1:59 AM is before the closure", () => {
  // 7:00 AM class -> exactly 5:00 AM
  assert.equal(local(bookingOpensAt("2026-10-06T11:00:00.000Z", NY), NY), "2026-10-05 05:00");
  // 3:59 AM class -> 1:59 AM
  assert.equal(local(bookingOpensAt("2026-10-06T07:59:00.000Z", NY), NY), "2026-10-05 01:59");
});

test("uses absolute time across a DST change", () => {
  // Mon Nov 2 2026, 9:00 AM EST (DST ended Sun Nov 1) -> 26 h earlier is Sun 7:00 AM EST
  assert.equal(local(bookingOpensAt("2026-11-02T14:00:00.000Z", NY), NY), "2026-11-01 07:00");
});

test("wall-clock interpretation agrees away from DST changes", () => {
  const w = bookingWindow("2026-10-06T17:00:00.000Z", "2026-10-06T13:00:00", NY);
  assert.equal(w.approximate, false);
  assert.equal(local(w.opensAt, NY), "2026-10-05 11:00");
});

test("across a DST change the earlier candidate wins and is flagged approximate", () => {
  // Sun Nov 1 2026, 10:00 AM EST; clocks fell back at 2:00 AM that morning.
  // Absolute: Sat 13:00Z = 9:00 AM EDT. Wall-clock: Sat 8:00 AM EDT = 12:00Z (earlier).
  const w = bookingWindow("2026-11-01T15:00:00.000Z", "2026-11-01T10:00:00", NY);
  assert.equal(w.approximate, true);
  assert.equal(bookingOpensAtWallClock("2026-11-01T10:00:00", NY).toISOString(), "2026-10-31T12:00:00.000Z");
  assert.equal(w.opensAt.toISOString(), "2026-10-31T12:00:00.000Z");
});

test("applies the closure in the club's own time zone", () => {
  const LDN = "Europe/London";
  // Tue Oct 6 2026, 6:30 AM BST -> 4:30 AM local -> 5:00 AM
  assert.equal(local(bookingOpensAt("2026-10-06T05:30:00.000Z", LDN), LDN), "2026-10-05 05:00");
});
