// The "Remind me to book" calendar event for a class (handoff §5.7, critique H5).

import { displayName } from "../../../../shared/families.ts";
import { classUrl } from "../../../../shared/links.ts";
import type { BookingStatus } from "../../lib/booking.ts";
import { buildIcs, googleCalendarUrl, type ReminderEvent } from "../../lib/ics.ts";
import type { ResultItem } from "../../lib/results.ts";
import { DAY_SHORT, dateOf, formatClock, minutesOf, weekdayOf } from "../../lib/time.ts";

export function reminderEvent(item: ResultItem, status: Extract<BookingStatus, { state: "opens" }>): ReminderEvent {
  const { c, club } = item;
  const when = `${DAY_SHORT[weekdayOf(dateOf(c.startLocal))]} ${formatClock(minutesOf(c.startLocal))}`;
  const name = displayName(c.name);
  return {
    uid: `${c.classInstanceId}-booking@equinox-classes`,
    title: `Book: ${name} · ${when} · ${club.shortName}`,
    start: status.opensAt,
    durationMinutes: 15,
    url: classUrl(c.classInstanceId),
    description: `Booking for ${name} (${when}, ${club.name}) opens now. Book on equinox.com: ${classUrl(c.classInstanceId)}`,
    location: club.address ? `${club.fullName}, ${club.address}` : club.fullName,
  };
}

export const icsFor = (ev: ReminderEvent) => buildIcs(ev);
export const googleUrlFor = (ev: ReminderEvent) => googleCalendarUrl(ev);
