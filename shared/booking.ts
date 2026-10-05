// When does booking open for a class?
//
// Equinox rules (equinox.com/bookingrules, checked 2026-10-04):
//   - booking opens 26 hours before class start;
//   - booking is closed 2:00-5:00 AM club-local every day, so an opening that
//     lands in that window actually happens at 5:00 AM.
// Members with 3 penalties in 30 days get a 90-minute window instead; we ignore that.
//
// Unknown: whether Equinox subtracts 26 *absolute* hours or 26 *wall-clock*
// hours. They differ by an hour when a DST change falls in between. We expose
// both so callers can show the earlier one as "around" near DST changes.

export const BOOKING_LEAD_HOURS = 26;
const CLOSED_FROM_MIN = 2 * 60;
const CLOSED_UNTIL_MIN = 5 * 60;
const HOUR_MS = 3600_000;

interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function wallTime(d: Date, timeZone: string): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** The instant at which the given wall-clock time occurs in `timeZone`. */
function wallToInstant(w: Wall, timeZone: string): Date {
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  // Two passes settle the zone offset, including across DST edges.
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const seen = wallTime(new Date(guess), timeZone);
    const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    guess += asUtc - seenUtc;
  }
  return new Date(guess);
}

/** Move an opening that falls in the nightly 2-5 AM closure to 5:00 AM. */
export function applyClosure(open: Date, timeZone: string): Date {
  const w = wallTime(open, timeZone);
  const mins = w.hour * 60 + w.minute;
  if (mins >= CLOSED_FROM_MIN && mins < CLOSED_UNTIL_MIN) {
    return new Date(open.getTime() + (CLOSED_UNTIL_MIN - mins) * 60_000);
  }
  return open;
}

/** Opening time assuming 26 absolute hours before start. */
export function bookingOpensAt(startUtc: string | Date, timeZone: string): Date {
  const start = typeof startUtc === "string" ? new Date(startUtc) : startUtc;
  return applyClosure(new Date(start.getTime() - BOOKING_LEAD_HOURS * HOUR_MS), timeZone);
}

/** Opening time assuming 26 wall-clock hours before the club-local start ("2026-10-06T07:00:00"). */
export function bookingOpensAtWallClock(startLocal: string, timeZone: string): Date {
  const [date, time] = startLocal.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const shifted = new Date(Date.UTC(y, mo - 1, d, h, mi) - BOOKING_LEAD_HOURS * HOUR_MS);
  const wall: Wall = {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
  return applyClosure(wallToInstant(wall, timeZone), timeZone);
}

/**
 * Best estimate for display and reminders: the earlier of the two
 * interpretations (never remind too late), flagged approximate when they differ.
 */
export function bookingWindow(
  startUtc: string,
  startLocal: string,
  timeZone: string,
): { opensAt: Date; approximate: boolean } {
  const absolute = bookingOpensAt(startUtc, timeZone);
  const wall = bookingOpensAtWallClock(startLocal, timeZone);
  const approximate = Math.abs(absolute.getTime() - wall.getTime()) >= 60_000;
  return { opensAt: absolute <= wall ? absolute : wall, approximate };
}
