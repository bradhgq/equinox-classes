import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClubSchedule } from "../shared/schema.ts";
import { INDEX } from "../web/src/lib/test-fixture.ts";
import { calendarFeed } from "./calendar.ts";

function dataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "eqx-cal-"));
  mkdirSync(join(dir, "clubs"));
  writeFileSync(join(dir, "index.json"), JSON.stringify(INDEX));
  const schedule: ClubSchedule = {
    version: 1,
    clubId: "112",
    generatedAt: INDEX.generatedAt,
    timeZone: "America/New_York",
    range: { start: "2026-10-04", end: "2026-10-24" },
    descriptions: {},
    classes: [
      {
        classInstanceId: 7,
        classId: 7,
        name: "Beats Ride",
        family: "beats-ride",
        workoutCategoryId: 6,
        startLocal: "2026-10-07T18:30:00",
        endLocal: "2026-10-07T19:15:00",
        startDate: "2026-10-07T22:30:00Z",
        instructor: "Erin Ay",
        substitute: null,
        studioName: null,
        classLevel: null,
      },
    ],
  };
  writeFileSync(join(dir, "clubs", "112.json"), JSON.stringify(schedule));
  return dir;
}

const NOW = new Date("2026-10-05T12:00:00Z");

test("a share query becomes a feed of booking events, with a stable ETag", () => {
  const dir = dataDir();
  const a = calendarFeed(dir, "club=greenwich-avenue&cat=cycling", NOW);
  assert.equal(a.body.split("BEGIN:VEVENT").length - 1, 1);
  assert.match(a.body, /SUMMARY:Book: Beats Ride · Wed 6:30 PM · Greenwich Ave/);
  assert.equal(calendarFeed(dir, "club=greenwich-avenue&cat=cycling", NOW).etag, a.etag);
});

test("a club with no file yet, or a link to nothing, still gives a valid (empty) calendar", () => {
  const dir = dataDir();
  const missing = calendarFeed(dir, "club=soho", NOW); // SoHo is in the index but has no file
  assert.equal(missing.body.split("BEGIN:VEVENT").length - 1, 0);
  assert.match(missing.body, /^BEGIN:VCALENDAR\r\n[\s\S]*END:VCALENDAR\r\n$/);
  assert.match(calendarFeed(dir, "club=not-a-club", NOW).body, /X-WR-CALNAME:Equinox classes that fit/);
});

test("new data is picked up without a restart", () => {
  const dir = dataDir();
  const before = calendarFeed(dir, "club=greenwich-avenue", NOW).etag;
  // The downloader rewrites the files (new timestamp → new DTSTAMP).
  writeFileSync(join(dir, "index.json"), JSON.stringify({ ...INDEX, generatedAt: "2026-10-05T10:30:00.000Z" }));
  assert.notEqual(calendarFeed(dir, "club=greenwich-avenue", NOW).etag, before);
});
