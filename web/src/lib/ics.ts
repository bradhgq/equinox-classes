// Calendar text (RFC 5545) for two uses:
// - the booking reminder (handoff §5.7, critique H5): one 15-minute "Book: …" event at the
//   moment booking opens, with an alert at its start. Google drops imported alerts but still
//   applies its default reminder near the event start, so the nudge lands close anyway;
// - the subscription feed: classes at their real times (lib/feed.ts).

export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  url: string;
  description: string;
  location?: string;
  /** Marked cancelled, for calendars that show it. */
  cancelled?: boolean;
  /** An alert at the event's start (the booking reminder). */
  alertAtStart?: boolean;
}

/** 2026-10-06T09:00:00.000Z -> "20261006T090000Z" */
export function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 TEXT escaping. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

function eventLines(ev: CalendarEvent, stamp: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${icsUtc(stamp)}`,
    `DTSTART:${icsUtc(ev.start)}`,
    `DTEND:${icsUtc(ev.end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(ev.description)}`,
    ...(ev.location ? [`LOCATION:${escapeText(ev.location)}`] : []),
    `URL:${ev.url}`,
    ...(ev.cancelled ? ["STATUS:CANCELLED"] : []),
    ...(ev.alertAtStart ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(ev.title)}`, "TRIGGER:PT0M", "END:VALARM"] : []),
    "END:VEVENT",
  ];
}

const calendarText = (lines: string[]) => lines.map(foldLine).join("\r\n") + "\r\n";

/** A single event, downloaded as a file (the booking reminder). */
export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  return calendarText([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//equinox-classes//reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventLines(ev, now),
    "END:VCALENDAR",
  ]);
}

export interface CalendarMeta {
  name: string;
  description: string;
  /** Re-fetch hint as an ISO 8601 duration ("PT6H"). Outlook honors it; Apple and Google keep their own schedules. */
  refresh: string;
}

/** A subscribable calendar (the webcal feed): many events under one name. */
export function buildCalendar(events: readonly CalendarEvent[], meta: CalendarMeta, stamp: Date): string {
  return calendarText([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//equinox-classes//feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(meta.name)}`,
    `X-WR-CALDESC:${escapeText(meta.description)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${meta.refresh}`,
    `X-PUBLISHED-TTL:${meta.refresh}`,
    ...events.flatMap((ev) => eventLines(ev, stamp)),
    "END:VCALENDAR",
  ]);
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${icsUtc(ev.start)}/${icsUtc(ev.end)}`,
    details: `${ev.description}\n\n${ev.url}`,
    ...(ev.location ? { location: ev.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
