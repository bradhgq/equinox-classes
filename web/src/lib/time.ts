// Dates and times as the app shows them. Class times are club-local wall-clock
// strings ("2026-10-06T07:00:00"), so most helpers work on those strings
// directly and never touch the device's time zone.

export const DAY_CODES = ["su", "mo", "tu", "we", "th", "fr", "sa"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-10-06T07:15:00" -> "2026-10-06" */
export const dateOf = (local: string): string => local.slice(0, 10);

/** "2026-10-06T07:15:00" -> 435 (minutes after midnight) */
export function minutesOf(local: string): number {
  return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
}

function utcNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** Weekday of a calendar date, Sunday = 0. */
export function weekdayOf(date: string): number {
  return utcNoon(date).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = utcNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Sunday that starts the week containing `date`. */
export function weekStartOf(date: string): string {
  return addDays(date, -weekdayOf(date));
}

/** The device's local calendar date. */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 435 -> "7:15 AM"; 1020 -> "5:00 PM". */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Like formatClock but drops ":00" and the period: 360 -> "6", 390 -> "6:30". */
function clockCompact(minutes: number): string {
  const h = ((Math.floor(minutes / 60) + 11) % 12) + 1;
  const m = minutes % 60;
  return m ? `${h}:${String(m).padStart(2, "0")}` : String(h);
}

const period = (minutes: number) => (Math.floor(minutes / 60) % 24 < 12 ? "AM" : "PM");

/** A time range as people say it: "6–9 AM", "11 AM–2 PM", "6:30–9 AM". */
export function formatRange(start: number, end: number): string {
  const sp = period(start);
  const ep = period(end % 1440);
  return sp === ep
    ? `${clockCompact(start)}–${clockCompact(end)} ${ep}`
    : `${clockCompact(start)} ${sp}–${clockCompact(end)} ${ep}`;
}

/** "2026-10-05" -> "Monday, Oct 5" */
export function formatDayHeading(date: string): string {
  const d = utcNoon(date);
  return `${DAY_LONG[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2026-10-31" -> "Oct 31" */
export function formatMonthDay(date: string): string {
  const d = utcNoon(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2026-10-05" -> "Mon, Oct 5" */
export function formatShortDate(date: string): string {
  const d = utcNoon(date);
  return `${DAY_SHORT[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2026-10-18", "2026-10-24" -> "Oct 18 – 24" (or "Oct 25 – Nov 1"). */
export function formatDateSpan(start: string, end: string): string {
  const a = utcNoon(start);
  const b = utcNoon(end);
  const left = `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}`;
  const right = a.getUTCMonth() === b.getUTCMonth() ? `${b.getUTCDate()}` : `${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}`;
  return `${left} – ${right}`;
}

/** Whole days between two calendar dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcNoon(b).getTime() - utcNoon(a).getTime()) / 86_400_000);
}

/** "2 h ago", "5 min ago", "3 d ago". */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Intl formatters are slow to build and cheap to reuse: one per zone and purpose (rows call these a lot). */
const zoneFormats = new Map<string, Intl.DateTimeFormat>();

function zoneFormat(timeZone: string, purpose: "parts" | "abbrev"): Intl.DateTimeFormat {
  const key = `${purpose}|${timeZone}`;
  let format = zoneFormats.get(key);
  if (!format) {
    format =
      purpose === "parts"
        ? new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
    zoneFormats.set(key, format);
  }
  return format;
}

/** Format an instant in a club's zone: { weekday: "Tue", date: "Oct 6", time: "5:00 AM" }. */
export function formatInZone(d: Date, timeZone: string): { weekday: string; date: string; time: string } {
  const parts = zoneFormat(timeZone, "parts").formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: get("weekday"), date: `${get("month")} ${get("day")}`, time: `${get("hour")}:${get("minute")} ${get("dayPeriod")}` };
}

/** Short zone label for a club zone at a given instant: "ET", "PT", "UK". */
export function zoneAbbrev(timeZone: string, at: Date = new Date()): string {
  if (timeZone === "Europe/London") return "UK"; // reads better than "GMT+1" (critique L4)
  const name = zoneFormat(timeZone, "abbrev")
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  if (!name) return "";
  // "EDT"/"EST" -> "ET" reads better in a compact tag; keep others ("GMT+1", "BST") as given.
  const m = /^([ECMP])[SD]T$/.exec(name);
  return m ? `${m[1]}T` : name;
}
