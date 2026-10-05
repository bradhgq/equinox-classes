// Links into equinox.com (see apis/README.md "Booking, deep links and the app").

/** Equinox's booking rules (26 h window, 2–5 AM closure), as shared/booking.ts implements them. */
export const BOOKING_RULES_URL = "https://www.equinox.com/bookingrules";

/** Public class page; members sign in there to book. /groupfitness/<id> redirects here. */
export function classUrl(classInstanceId: number): string {
  return `https://www.equinox.com/groupfitness/classes/${classInstanceId}`;
}
