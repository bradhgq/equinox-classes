// The calendar subscription for a search (notifications v2a, docs/notifications-v2.md):
// one "Book: …" event per matching class, at the moment its booking opens. The server
// renders it at /calendar.ics?<share query>; this module is the pure part.

import { bookingWindow } from "../../../shared/booking.ts";
import type { ClubSchedule } from "../../../shared/schema.ts";
import type { Catalog } from "./catalog.ts";
import { searchPhrase } from "./filters/summary.ts";
import type { Filters } from "./filters/types.ts";
import { buildCalendar } from "./ics.ts";
import { reminderEvent } from "./reminder.ts";
import { buildResults, type ResultItem } from "./results.ts";

/** Past this many a week, alerts turn into noise: the subscribe sheet suggests narrowing first. */
export const FEED_BUSY_PER_WEEK = 25;
/** Most events one feed carries (soonest first). The sheet won't offer a feed that would be cut. */
export const FEED_MAX_EVENTS = 300;

/** The page's own matches for these filters, minus cancelled classes (they never open). */
export function feedItems(catalog: Catalog, filters: Filters, schedules: readonly ClubSchedule[], nowMs: number): ResultItem[] {
  return buildResults(catalog, filters, schedules, nowMs)
    .days.flatMap((d) => d.items)
    .filter(({ c }) => !c.isCancelled);
}

/** The calendar's name in the person's calendar list. */
export function feedName(filters: Filters, catalog: Catalog): string {
  const phrase = searchPhrase(filters, catalog);
  return phrase ? `Equinox · ${phrase}` : "Equinox classes that fit";
}

export function buildFeed(catalog: Catalog, filters: Filters, schedules: readonly ClubSchedule[], now: Date): string {
  const events = feedItems(catalog, filters, schedules, now.getTime())
    .slice(0, FEED_MAX_EVENTS)
    .map((item) => reminderEvent(item, bookingWindow(item.c.startDate, item.c.startLocal, item.club.timeZone).opensAt));
  const phrase = searchPhrase(filters, catalog);
  return buildCalendar(
    events,
    {
      name: feedName(filters, catalog),
      description:
        `Booking alerts from Equinox classes that fit (unofficial): an event when booking opens for each class` +
        `${phrase ? ` matching ${phrase}` : ""}. New classes appear as Equinox publishes them.`,
      refresh: "PT6H",
    },
    new Date(catalog.index.generatedAt),
  );
}
