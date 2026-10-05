import { test } from "node:test";
import assert from "node:assert/strict";
import type { ClassItem, ClubSchedule } from "../../../shared/schema.ts";
import { buildFeed, feedItems, feedName } from "./feed.ts";
import { decodeFilters } from "./filters/codec.ts";
import { buildResults } from "./results.ts";
import { catalog } from "./test-fixture.ts";

const cls = (id: number, name: string, family: string, categoryId: number, startLocal: string, startDate: string, extra: Partial<ClassItem> = {}): ClassItem => ({
  classInstanceId: id,
  classId: id,
  name,
  family,
  workoutCategoryId: categoryId,
  startLocal,
  endLocal: startLocal.replace(/T(\d\d)/, (_, h) => `T${String(Number(h) + 1).padStart(2, "0")}`),
  startDate,
  instructor: "Erin Ay",
  substitute: null,
  studioName: "Studio 1",
  classLevel: null,
  ...extra,
});

// Greenwich Ave, New York (EDT = UTC-4 in October).
const schedule: ClubSchedule = {
  version: 1,
  clubId: "112",
  generatedAt: "2026-10-04T22:00:00.000Z",
  timeZone: "America/New_York",
  range: { start: "2026-10-04", end: "2026-10-24" },
  descriptions: {},
  classes: [
    cls(1, "Vinyasa Yoga", "vinyasa-yoga", 104, "2026-10-06T07:00:00", "2026-10-06T11:00:00Z"), // Tue 7 AM: match
    cls(2, "Beats Ride", "beats-ride", 6, "2026-10-06T07:30:00", "2026-10-06T11:30:00Z"), // cycling: no
    cls(3, "Power Vinyasa", "power-vinyasa", 104, "2026-10-06T19:00:00", "2026-10-06T23:00:00Z"), // 7 PM: no
    cls(4, "Vinyasa Yoga", "vinyasa-yoga", 104, "2026-10-08T06:00:00", "2026-10-08T10:00:00Z"), // Thu 6 AM: match
    cls(5, "Vinyasa Yoga", "vinyasa-yoga", 104, "2026-10-13T08:00:00", "2026-10-13T12:00:00Z", { isCancelled: true }), // cancelled
    cls(6, "Vinyasa Yoga", "vinyasa-yoga", 104, "2026-10-05T07:00:00", "2026-10-05T11:00:00Z"), // Mon: started by "now"
  ],
};

const NOW = new Date("2026-10-05T12:00:00Z");
const { filters } = decodeFilters("club=greenwich-avenue&day=mo,tu,we,th,fr&time=6-9&cat=yoga", catalog);

test("the feed holds exactly the page's matches, minus cancelled ones", () => {
  const ids = feedItems(catalog, filters, [schedule], NOW.getTime()).map((i) => i.c.classInstanceId);
  assert.deepEqual(ids, [1, 4]);
  // Parity with the agenda: same classes, and the page's count already leaves out cancelled ones.
  assert.equal(buildResults(catalog, filters, [schedule], NOW.getTime()).count, ids.length);
});

test("each event starts when booking opens (26 h before), with an alert at its start", () => {
  const ics = buildFeed(catalog, filters, [schedule], NOW);
  const events = ics.split("BEGIN:VEVENT").slice(1);
  assert.equal(events.length, 2);
  // Tue 7:00 AM EDT (11:00Z) → booking opens Mon 5:00 AM EDT (09:00Z).
  assert.match(events[0], /DTSTART:20261005T090000Z/);
  assert.match(events[0], /DTEND:20261005T091500Z/);
  assert.match(events[0], /SUMMARY:Book: Vinyasa Yoga · Tue 7:00 AM · Greenwich Ave/);
  assert.match(events[0], /TRIGGER:PT0M/);
  assert.match(events[0], /UID:1-booking@equinox-classes/);
  // Thu 6:00 AM → 26 h earlier is Wed 4:00 AM, inside the 2–5 AM closure, so it opens at 5:00 AM.
  assert.match(events[1], /DTSTART:20261007T090000Z/);
});

test("the calendar is named after the search and is valid line-wise", () => {
  const ics = buildFeed(catalog, filters, [schedule], NOW);
  assert.equal(feedName(filters, catalog), "Equinox · Yoga at Greenwich Ave on weekdays, 6–9 AM");
  assert.match(ics.replace(/\r\n /g, ""), /X-WR-CALNAME:Equinox · Yoga at Greenwich Ave on weekdays\\, 6–9 AM/);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  // DTSTAMP is the data's timestamp, so an unchanged schedule renders an identical feed (stable ETag).
  assert.equal(ics, buildFeed(catalog, filters, [schedule], new Date(NOW.getTime() + 60_000)));
});
