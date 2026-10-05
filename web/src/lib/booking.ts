// Booking status for display: open now, or when it opens (handoff §5.6, §5.7).
// The rule itself lives in shared/booking.ts.

import type { ClassItem } from "../../../shared/schema.ts";
import { bookingWindow } from "../../../shared/booking.ts";
import { formatInZone } from "./time.ts";

export type BookingStatus =
  | { state: "started" }
  | { state: "open"; opensAt: Date; approximate: boolean }
  | { state: "opens"; opensAt: Date; approximate: boolean };

const DAY_MS = 86_400_000;

export function bookingStatus(c: ClassItem, timeZone: string, nowMs: number): BookingStatus {
  if (Date.parse(c.startDate) <= nowMs) return { state: "started" };
  const { opensAt, approximate } = bookingWindow(c.startDate, c.startLocal, timeZone);
  return { state: opensAt.getTime() <= nowMs ? "open" : "opens", opensAt, approximate };
}

/** "5 AM", "5:15 AM" */
function compactTime(d: Date, timeZone: string): string {
  return formatInZone(d, timeZone).time.replace(":00 ", " ");
}

/**
 * Row tag: "Opens 5 AM" when booking opens within 24 h; otherwise nothing.
 * "Open" isn't tagged in rows: nearly every class in the next day is open, so
 * the tag would be noise (it still shows in the detail and desktop column).
 */
export function bookingTag(status: BookingStatus, timeZone: string, nowMs: number): string | null {
  if (status.state === "opens" && status.opensAt.getTime() - nowMs <= DAY_MS) {
    return `Opens ${status.approximate ? "~" : ""}${compactTime(status.opensAt, timeZone)}`;
  }
  return null;
}

/** Desktop booking column: "Opens Tue 5 AM" / "Open" / "". */
export function bookingColumn(status: BookingStatus, timeZone: string): string {
  if (status.state === "open") return "Open";
  if (status.state !== "opens") return "";
  const z = formatInZone(status.opensAt, timeZone);
  return `Opens ${status.approximate ? "~" : ""}${z.weekday} ${compactTime(status.opensAt, timeZone)}`;
}

/** Detail sentence: "Booking opens Tue, Oct 6 at 5:00 AM" (around, near DST changes). */
export function bookingSentence(status: BookingStatus, timeZone: string): string {
  if (status.state === "open") return "Booking is open";
  if (status.state === "started") return "This class has started";
  const z = formatInZone(status.opensAt, timeZone);
  return `Booking opens ${status.approximate ? "around " : ""}${z.weekday}, ${z.date} at ${z.time}`;
}
