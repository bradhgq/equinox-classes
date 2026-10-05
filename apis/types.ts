// Raw response shapes from api.production.equinox.com, trimmed to the fields we use.
// Anything member-specific (reservation status, waitlist, capacity) comes back null
// for unauthenticated requests, so it is typed as nullable here.

export interface RawFacilityContact {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  phoneNumber: string | null;
}

export interface RawFacility {
  facilityId: string;
  clubId: number;
  name: string; // "Equinox Greenwich Avenue"
  webName: string | null; // "Greenwich Avenue"
  shortName: string | null; // "Greenwich Ave"
  mobileName: string | null;
  urlName: string | null; // "GreenwichAve" (null for a few clubs)
  region: string | null; // "New York/Downtown", "Connecticut", "Canada/Toronto"
  subRegion: string | null; // "Downtown" (null when region has no slash)
  status: "Open" | "ComingSoon" | "Presale" | "LeadInept" | string;
  clubType: "Regular" | "E" | "SportsClub" | null | string;
  timeZone: string; // Windows zone name, e.g. "Eastern Standard Time"
  isAvailableOnline: boolean;
  isPresale: boolean;
  facilityContact: RawFacilityContact | null;
}

export interface RawFacilitiesResponse {
  response: { success: boolean; messages: unknown; facilities: RawFacility[] };
}

export interface RawPerson {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

export interface RawClassStatus {
  isCancelled: boolean;
  isClassFull: boolean;
  isWithinReservationPeriod: boolean;
  reservationStartDate: string | null; // null when unauthenticated
  totalReservableItems: number | null;
  reservableItemsLeft: number | null;
}

export interface RawClass {
  classId: number; // class template ("Vinyasa Yoga")
  classInstanceId: number; // this specific occurrence
  name: string;
  classDescription?: string | null;
  startDate: string; // UTC ISO, "2026-10-04T12:45:00.000Z"
  endDate: string;
  startLocal: string; // club-local, "2026-10-04T08:45:00"
  endLocal: string;
  workoutCategoryId: number;
  workoutSubCategoryId: number | null;
  studioName: string | null;
  timeSlot: "Morning" | "Afternoon" | "Evening" | string | null;
  bookingType: string | null; // "Online" for everything seen so far
  isNew: boolean;
  isCycling: boolean;
  label: { name: string; type: string; color: string } | null; // "New" | "Updated"
  classLevel: { classLevelID: number; content: string | null } | null;
  instructors: { instructor: RawPerson | null; substitute: RawPerson | null }[] | null;
  status: RawClassStatus | null;
  facility: { facilityId: string; clubId: number; name: string; timeZoneId: string };
}

export interface RawClassesResponse {
  messages: { messageID: number; errorMessage: string; friendlyMessage: string }[] | null;
  classes: RawClass[] | null;
}

export interface RawCatalogCategory {
  categoryId: number;
  classDetails: { classId: number; className: string; totalReservations: number | null }[];
}

export interface RawClassDetail {
  classId: number;
  classInstanceId: number;
  name: string;
  description: string | null;
  benefits: { strength: number; cardio: number; flexibility: number; regeneration: number } | null;
  studio: { id: number; name: string; studioCode: string } | null;
  startDate: string;
  startLocal: string;
  endDate: string;
  endLocal: string;
  workoutCategoryId: number;
  classLevel: { content: string | null; classLevelCode: string | null } | null;
}
