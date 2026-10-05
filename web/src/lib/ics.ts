// Calendar reminders (handoff §5.7, critique H5). The reminder *is* the event:
// a 15-minute "Book: …" event at the moment booking opens, with an alarm at its
// start. Google Calendar drops imported alarms but still applies its default
// reminder near the event start, so the nudge lands close to the opening anyway.

export interface ReminderEvent {
  uid: string;
  title: string;
  start: Date;
  durationMinutes: number;
  url: string;
  description: string;
  location?: string;
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

/** One VEVENT, with its alarm at the event's start. */
function eventLines(ev: ReminderEvent, stamp: Date): string[] {
  const end = new Date(ev.start.getTime() + ev.durationMinutes * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${icsUtc(stamp)}`,
    `DTSTART:${icsUtc(ev.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(ev.description)}`,
    ...(ev.location ? [`LOCATION:${escapeText(ev.location)}`] : []),
    `URL:${ev.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(ev.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];
}

const calendarText = (lines: string[]) => lines.map(foldLine).join("\r\n") + "\r\n";

/** A single reminder, downloaded as a file. */
export function buildIcs(ev: ReminderEvent, now: Date = new Date()): string {
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
export function buildCalendar(events: readonly ReminderEvent[], meta: CalendarMeta, stamp: Date): string {
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

export function googleCalendarUrl(ev: ReminderEvent): string {
  const end = new Date(ev.start.getTime() + ev.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${icsUtc(ev.start)}/${icsUtc(end)}`,
    details: `${ev.description}\n\n${ev.url}`,
    ...(ev.location ? { location: ev.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
