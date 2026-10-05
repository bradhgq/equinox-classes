// Data contract between the downloader (writer) and the web app (reader).
//
// Layout under the data root (served statically at /data):
//   index.json            DataIndex: cities, areas, clubs, categories, class families
//   clubs/<clubId>.json   ClubSchedule: every class at one club across the horizon
//
// Class fields keep Equinox's own names and formats (see apis/types.ts) so the
// data reads like the API; we only drop unused fields and flatten a few nested ones.
//
// Bump SCHEMA_VERSION on any breaking change; the web app refuses unknown versions.

export const SCHEMA_VERSION = 1;

/** Club-local wall-clock time as the API returns it, no offset: "2026-10-04T08:45:00". */
export type LocalDateTime = string;
/** Club-local calendar date: "2026-10-04". */
export type LocalDate = string;

export interface Category {
  id: number; // Equinox workoutCategoryId
  name: string; // "Cycling"
  slug: string; // "cycling" (used in share links)
}

/**
 * An official Equinox sub-region inside a city ("Downtown", "The Valley").
 * Only cities whose clubs carry a `subRegion` have areas.
 */
export interface Area {
  slug: string; // "new-york-downtown" (city + area; used in share links; unique)
  name: string; // "Downtown"
  clubIds: string[]; // sorted by club name
}

export interface City {
  slug: string; // "new-york" (used in share links)
  name: string; // "New York"
  /** Official sub-regions, most clubs first; [] when the city has none. */
  areas: Area[];
  /** Every club in the city: grouped by area (in `areas` order), then by name. */
  clubIds: string[];
}

export interface Club {
  id: string; // Equinox facilityId, "112"
  slug: string; // "greenwich-avenue" (used in share links; unique)
  name: string; // "Greenwich Avenue" (webName; what the UI shows)
  fullName: string; // "Equinox Greenwich Avenue"
  shortName: string; // "Greenwich Ave" (compact labels on class rows)
  city: string; // City.slug
  area: string | null; // Area.slug when the city has areas, else null
  town: string | null; // facilityContact.city, e.g. "Miami Beach" (secondary grouping/label)
  timeZone: string; // IANA, "America/New_York"
  clubType: string | null; // "Regular" | "E" | "SportsClub"
  address: string | null;
  lat: number | null;
  lon: number | null;
  classCount: number; // classes in this download
  firstDate: LocalDate | null; // first local date with a class
  lastDate: LocalDate | null; // last local date with a class (the club's published horizon)
}

/**
 * A class "family" is what the class-name filter lists. Most families are a
 * single class name ("Vinyasa Yoga", "Rounds: Boxing"); some collapse many
 * one-off variants under their prefix ("Theme Ride" for "THEME RIDE: Charli XCX
 * x Rufus Du Sol"). Rules live in shared/families.ts.
 */
export interface ClassFamily {
  key: string; // stable slug, "vinyasa-yoga", "theme-ride" (used in share links)
  name: string; // display name, "Vinyasa Yoga"
  categoryId: number; // most common category among its classes
  count: number; // scheduled classes in this download
  clubCount: number; // clubs that schedule it
  variants: string[]; // distinct full names folded into this family (for search), most common first
}

export interface DataIndex {
  version: typeof SCHEMA_VERSION;
  generatedAt: string; // ISO UTC: when the underlying snapshot was fetched
  /** Union of club ranges, in local dates. */
  horizon: { start: LocalDate; end: LocalDate };
  categories: Category[];
  cities: City[]; // most clubs first
  clubs: Club[];
  families: ClassFamily[]; // sorted by count desc
}

/** One scheduled class. Field names and value formats follow the API's class object. */
export interface ClassItem {
  classInstanceId: number; // this occurrence; equinox.com/groupfitness/classes/<classInstanceId>
  classId: number; // class template ("Vinyasa Yoga" everywhere)
  name: string; // full name as Equinox publishes it
  family: string; // ClassFamily.key (ours; from shared/families.ts)
  workoutCategoryId: number; // Category.id
  startLocal: LocalDateTime;
  endLocal: LocalDateTime;
  startDate: string; // UTC ISO as the API returns it; used for booking-open times
  instructor: string | null; // instructors[0].instructor as "First Last"
  substitute: string | null; // instructors[0].substitute as "First Last", when someone is covering
  studioName: string | null;
  classLevel: string | null; // classLevel.content, "All Levels Welcome"
  isCancelled?: true; // status.isCancelled, only present when true
  label?: "New" | "Updated"; // label.name, only present when set
}

export interface ClubSchedule {
  version: typeof SCHEMA_VERSION;
  clubId: string;
  generatedAt: string; // ISO UTC
  timeZone: string; // IANA
  /** Local date range that was requested (inclusive). */
  range: { start: LocalDate; end: LocalDate };
  classes: ClassItem[]; // sorted by startLocal, then name
  /**
   * Class descriptions keyed by String(ClassItem.classId), from the API's
   * `classDescription`. Kept out of ClassItem so repeated classes don't repeat
   * the text. Only classIds that occur in `classes` and have a non-empty
   * description.
   */
  descriptions: Record<string, string>;
}
