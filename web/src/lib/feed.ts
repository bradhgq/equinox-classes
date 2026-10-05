// The calendar subscription for a search (notifications v2a, docs/notifications-v2.md):
// every matching class at its real time, with when booking opens and the link to book in
// its notes. Booking-time events are only for the class detail's "Remind me to book"
// (lib/reminder.ts). The server renders this at /calendar.ics?<share query>.

import { bookingWindow } from "../../../shared/booking.ts";
import { displayName } from "../../../shared/families.ts";
import { classUrl } from "../../../shared/links.ts";
import type { ClubSchedule } from "../../../shared/schema.ts";
import type { Catalog } from "./catalog.ts";
import { searchPhrase } from "./filters/summary.ts";
import type { Filters } from "./filters/types.ts";
import { buildCalendar, type CalendarEvent } from "./ics.ts";
import { buildResults, instructorText, type ResultItem } from "./results.ts";
import { formatInZone, minutesOf } from "./time.ts";

/** Past this many classes a week, a calendar gets crowded: the subscribe sheet suggests narrowing first. */
export const FEED_BUSY_PER_WEEK = 25;
/** Most events one feed carries (soonest first). The sheet won't offer a feed that would be cut. */
export const FEED_MAX_EVENTS = 300;

/** The page's own matches for these filters. Cancelled classes stay, marked, so they don't just vanish. */
export function feedItems(catalog: Catalog, filters: Filters, schedules: readonly ClubSchedule[], nowMs: number): ResultItem[] {
  return buildResults(catalog, filters, schedules, nowMs).days.flatMap((d) => d.items);
}

/** A class at its real time. */
export function classEvent(item: ResultItem): CalendarEvent {
  const { c, club } = item;
  const start = new Date(c.startDate);
  const minutes = (minutesOf(c.endLocal) - minutesOf(c.startLocal) + 1440) % 1440 || 60;
  const url = classUrl(c.classInstanceId);
  const opens = formatInZone(bookingWindow(c.startDate, c.startLocal, club.timeZone).opensAt, club.timeZone);
  const details = [instructorText(item), c.studioName, c.classLevel].filter(Boolean).join(" · ");
  return {
    uid: `${c.classInstanceId}@equinox-classes`,
    title: `${c.isCancelled ? "Cancelled: " : ""}${displayName(c.name)} · ${club.shortName}`,
    start,
    end: new Date(start.getTime() + minutes * 60_000),
    url,
    description: [
      details,
      c.isCancelled ? "This class was cancelled." : `Booking opens ${opens.weekday} ${opens.date}, ${opens.time}.`,
      `Book on equinox.com: ${url}`,
    ].join("\n"),
    location: club.address ? `${club.fullName}, ${club.address}` : club.fullName,
    cancelled: c.isCancelled,
  };
}

/** The calendar's name in the person's calendar list. */
export function feedName(filters: Filters, catalog: Catalog): string {
  const phrase = searchPhrase(filters, catalog);
  return phrase ? `Equinox · ${phrase}` : "Equinox classes that fit";
}

export function buildFeed(catalog: Catalog, filters: Filters, schedules: readonly ClubSchedule[], now: Date): string {
  const events = feedItems(catalog, filters, schedules, now.getTime()).slice(0, FEED_MAX_EVENTS).map(classEvent);
  const phrase = searchPhrase(filters, catalog);
  return buildCalendar(
    events,
    {
      name: feedName(filters, catalog),
      description:
        `Equinox classes${phrase ? ` matching ${phrase}` : ""}, from Equinox classes that fit (unofficial). ` +
        "New classes appear as Equinox publishes them.",
      refresh: "PT6H",
    },
    new Date(catalog.index.generatedAt),
  );
}
