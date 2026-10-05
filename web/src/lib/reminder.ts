// The "Book: …" calendar event for one class (handoff §5.7, critique H5): a 15-minute
// event at the moment booking opens, so an alert at the event lands exactly then.
// Only the class detail's "Remind me to book" uses it; the subscription feed shows
// classes at their real times (lib/feed.ts).

import { displayName } from "../../../shared/families.ts";
import { classUrl } from "../../../shared/links.ts";
import type { CalendarEvent } from "./ics.ts";
import { instructorText, type ResultItem } from "./results.ts";
import { DAY_SHORT, dateOf, formatClock, minutesOf, weekdayOf } from "./time.ts";

export function reminderEvent(item: ResultItem, opensAt: Date): CalendarEvent {
  const { c, club } = item;
  const when = `${DAY_SHORT[weekdayOf(dateOf(c.startLocal))]} ${formatClock(minutesOf(c.startLocal))}`;
  const name = displayName(c.name);
  const url = classUrl(c.classInstanceId);
  return {
    uid: `${c.classInstanceId}-booking@equinox-classes`,
    title: `Book: ${name} · ${when} · ${club.shortName}`,
    start: opensAt,
    end: new Date(opensAt.getTime() + 15 * 60_000),
    url,
    description: `Booking for ${name} (${when}, ${club.name}, ${instructorText(item)}) opens now. Book on equinox.com: ${url}`,
    location: club.address ? `${club.fullName}, ${club.address}` : club.fullName,
    alertAtStart: true,
  };
}
