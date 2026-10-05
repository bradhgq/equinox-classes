import { test } from "node:test";
import assert from "node:assert/strict";
import type { ClassItem } from "../../../shared/schema.ts";
import { bookingColumn, bookingSentence, bookingStatus, bookingTag } from "./booking.ts";
import { readCookie, serializeCookie } from "./cookie.ts";
import { buildIcs, escapeText, foldLine, googleCalendarUrl } from "./ics.ts";
import { nextRange, withStart } from "./ranges.ts";
import { addDays, formatClock, formatDateSpan, formatDayHeading, formatRange, minutesOf, weekdayOf, weekStartOf } from "./time.ts";

test("time formatting", () => {
  assert.equal(formatClock(435), "7:15 AM");
  assert.equal(formatClock(720), "12:00 PM");
  assert.equal(formatRange(360, 540), "6–9 AM");
  assert.equal(formatRange(660, 840), "11 AM–2 PM");
  assert.equal(formatRange(390, 540), "6:30–9 AM");
  assert.equal(formatRange(1020, 1200), "5–8 PM");
  assert.equal(formatDayHeading("2026-10-05"), "Monday, Oct 5");
  assert.equal(formatDateSpan("2026-10-25", "2026-10-31"), "Oct 25 – 31");
  assert.equal(formatDateSpan("2026-10-25", "2026-11-01"), "Oct 25 – Nov 1");
  assert.equal(minutesOf("2026-10-05T18:45:00"), 1125);
  assert.equal(weekdayOf("2026-10-04"), 0);
  assert.equal(weekStartOf("2026-10-07"), "2026-10-04");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("ranges", () => {
  assert.deepEqual(nextRange([]), { start: 360, end: 540 });
  assert.deepEqual(nextRange([{ start: 1020, end: 1200 }]), { start: 360, end: 540 });
  assert.deepEqual(withStart({ start: 360, end: 540 }, 600), { start: 600, end: 660 });
  assert.equal(nextRange([{ start: 300, end: 1380 }]), null);
});

const cls = (startLocal: string, startDate: string): ClassItem => ({
  classInstanceId: 9,
  classId: 1,
  name: "Beats Ride",
  family: "beats-ride",
  workoutCategoryId: 6,
  startLocal,
  endLocal: startLocal,
  startDate,
  instructor: null,
  substitute: null,
  studioName: null,
  classLevel: null,
});

test("booking status, tag and sentence", () => {
  const NY = "America/New_York";
  const now = Date.parse("2026-10-04T23:00:00Z"); // Sun 7 PM ET
  const wed = bookingStatus(cls("2026-10-07T07:00:00", "2026-10-07T11:00:00.000Z"), NY, now);
  assert.equal(wed.state, "opens");
  assert.equal(bookingSentence(wed, NY), "Booking opens Tue, Oct 6 at 5:00 AM");
  assert.equal(bookingTag(wed, NY, now), null); // more than 24 h away
  assert.equal(bookingColumn(wed, NY), "Opens Tue 5 AM");
  const mon = bookingStatus(cls("2026-10-05T19:00:00", "2026-10-05T23:00:00.000Z"), NY, now);
  assert.equal(mon.state, "open");
  assert.equal(bookingTag(mon, NY, now), null); // open classes aren't tagged in rows
  assert.equal(bookingColumn(mon, NY), "Open");
  const tueEarly = bookingStatus(cls("2026-10-06T07:15:00", "2026-10-06T11:15:00.000Z"), NY, now);
  assert.equal(bookingTag(tueEarly, NY, now), "Opens 5:15 AM");
});

test("ics: escaping, folding and structure", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  const long = "DESCRIPTION:" + "x".repeat(200);
  const folded = foldLine(long);
  assert.ok(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  assert.equal(folded.replace(/\r\n /g, ""), long);
  const ev = {
    uid: "12293216@equinox-classes",
    title: "Book: Beats Ride · Wed 7:00 AM · Greenwich Ave",
    start: new Date("2026-10-06T09:00:00Z"),
    durationMinutes: 15,
    url: "https://www.equinox.com/groupfitness/classes/12293216",
    description: "Booking opens now.",
    location: "Equinox Greenwich Avenue, 97 Greenwich Avenue",
  };
  const ics = buildIcs(ev, new Date("2026-10-04T23:00:00Z"));
  assert.match(ics, /DTSTART:20261006T090000Z\r\n/);
  assert.match(ics, /DTEND:20261006T091500Z\r\n/);
  assert.match(ics, /TRIGGER:PT0M/);
  assert.match(googleCalendarUrl(ev), /dates=20261006T090000Z%2F20261006T091500Z/);
});

test("cookie round trip", () => {
  const value = "club=greenwich-avenue&day=mo,we&time=6-9";
  const header = serializeCookie("eqxc", value, { secure: true });
  assert.match(header, /^eqxc=club%3Dgreenwich-avenue%26day%3Dmo%2Cwe%26time%3D6-9; Path=\/; Max-Age=34560000; SameSite=Lax; Secure$/);
  const jar = `other=1; ${header.split(";")[0]}; x=y`;
  assert.equal(readCookie("eqxc", jar), value);
  assert.equal(readCookie("missing", jar), null);
});
