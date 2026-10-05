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
const events = (ics: string) => ics.split("BEGIN:VEVENT").slice(1);

test("the feed holds the page's matches, cancelled ones included and marked", () => {
  const items = feedItems(catalog, filters, [schedule], NOW.getTime());
  assert.deepEqual(items.map((i) => i.c.classInstanceId), [1, 4, 5]);
  // Parity with the page's count, which leaves cancelled classes out.
  assert.equal(buildResults(catalog, filters, [schedule], NOW.getTime()).count, items.filter((i) => !i.c.isCancelled).length);
});

test("each class sits at its real time, with booking time and link in the notes, and no alert", () => {
  const [tue, thu, cancelled] = events(buildFeed(catalog, filters, [schedule], NOW));
  assert.match(tue, /DTSTART:20261006T110000Z/);
  assert.match(tue, /DTEND:20261006T120000Z/);
  assert.match(tue, /SUMMARY:Vinyasa Yoga · Greenwich Ave/);
  assert.match(tue, /UID:1@equinox-classes/);
  assert.match(tue.replace(/\r\n /g, ""), /Booking opens Mon Oct 5\\, 5:00 AM\./);
  assert.doesNotMatch(tue, /VALARM/);
  // Thu 6:00 AM: 26 h earlier is Wed 4:00 AM, inside the 2–5 AM closure, so booking opens at 5:00 AM.
  assert.match(thu.replace(/\r\n /g, ""), /Booking opens Wed Oct 7\\, 5:00 AM\./);
  assert.match(cancelled, /SUMMARY:Cancelled: Vinyasa Yoga · Greenwich Ave/);
  assert.match(cancelled, /STATUS:CANCELLED/);
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
