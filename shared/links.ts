// Links into equinox.com (see apis/README.md "Booking, deep links and the app").

/**
 * Opens the Equinox app (Equinox+) on a phone that has it, on its home screen; the App Store otherwise.
 * The app claims every path on this domain (universal links). Class-specific app links are Branch
 * links only the app can make (apis/README.md "Booking, deep links and the app").
 */
export const EQUINOX_APP_URL = "https://m.equinoxplus.com/";

/** Equinox's booking rules (26 h window, 2–5 AM closure), as shared/booking.ts implements them. */
export const BOOKING_RULES_URL = "https://www.equinox.com/bookingrules";

/** Public class page; members sign in there to book. /groupfitness/<id> redirects here. */
export function classUrl(classInstanceId: number): string {
  return `https://www.equinox.com/groupfitness/classes/${classInstanceId}`;
}
