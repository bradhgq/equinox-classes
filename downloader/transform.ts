// Pure raw-API -> schema transforms: no I/O and no clock, so the build output
// is a function of the raw snapshot (plus shared/families.ts) alone.

import { CATEGORIES, ianaTimeZone } from "../apis/equinox.ts";
import type { RawClass, RawFacility, RawPerson } from "../apis/types.ts";
import { cleanName, familyOf, slugify } from "../shared/families.ts";
import type { Area, Category, City, ClassFamily, ClassItem, Club, LocalDate } from "../shared/schema.ts";

// --- small helpers ------------------------------------------------------------

/** Collapse whitespace runs and trim; null/undefined -> "". */
export const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();
const orNull = (s: string | null | undefined): string | null => squash(s) || null;

/** Locale-aware, number-aware name order ("East 43rd" < "East 53rd"), fully deterministic. */
export const byName = (a: string, b: string): number =>
  a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0);

export function increment<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

/** Keys by count desc; ties broken by `tie` (ascending). */
export function keysByCount<K>(m: Map<K, number>, tie: (a: K, b: K) => number): K[] {
  return [...m.keys()].sort((a, b) => (m.get(b) ?? 0) - (m.get(a) ?? 0) || tie(a, b));
}

export function mostCommon<K>(m: Map<K, number>, tie: (a: K, b: K) => number): K | undefined {
  return keysByCount(m, tie)[0];
}

const byNumber = (a: number, b: number): number => a - b;

// --- where a club is: city, area, town ----------------------------------------

/** Regions shaped "Country-or-state/City": the part after the slash is the city, not an area. */
const CITY_FROM_SUBREGION = new Set(["Canada", "Washington", "Pennsylvania"]);

export interface Place {
  city: { name: string; slug: string };
  /** Official Equinox sub-region ("Downtown"), null when the club has none. */
  area: { name: string; slug: string } | null;
  /** facilityContact.city ("Miami Beach"). */
  town: string | null;
}

/**
 * "New York/Downtown" -> city New York, area Downtown; "Canada/Toronto" -> city
 * Toronto, no area; "Florida" -> city Florida, no area. Without a region the
 * address city stands in for the city.
 */
export function placeOf(f: RawFacility): Place {
  const region = squash(f.region);
  const slash = region.indexOf("/");
  const head = (slash < 0 ? region : region.slice(0, slash)).trim();
  const tail = slash < 0 ? "" : region.slice(slash + 1).trim();
  const town = orNull(f.facilityContact?.city);
  const cityFromTail = CITY_FROM_SUBREGION.has(head) && tail !== "";
  const cityName = (cityFromTail ? tail : head || tail) || town || "Other";
  const sub = orNull(f.subRegion);
  const areaName = sub && !cityFromTail && sub.toLowerCase() !== cityName.toLowerCase() ? sub : null;
  return {
    city: { name: cityName, slug: slugify(cityName) },
    area: areaName ? { name: areaName, slug: slugify(`${cityName} ${areaName}`) } : null,
    town,
  };
}

const BRAND = /^equinox\s+/i;

/** "Equinox King West" -> "King West". */
export function stripBrand(s: string | null | undefined): string {
  return squash(s).replace(BRAND, "");
}

/** What the UI calls the club: webName, else the full name without "Equinox ". */
export function clubName(f: RawFacility): string {
  return squash(f.webName) || stripBrand(f.name) || squash(f.name) || String(f.facilityId);
}

function coord(s: string | null | undefined): number | null {
  if (s == null || String(s).trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface ClubStats {
  classCount: number;
  firstDate: LocalDate | null;
  lastDate: LocalDate | null;
}

export function clubStats(classes: readonly ClassItem[]): ClubStats {
  let first: string | null = null;
  let last: string | null = null;
  for (const c of classes) {
    const d = c.startLocal.slice(0, 10);
    if (first === null || d < first) first = d;
    if (last === null || d > last) last = d;
  }
  return { classCount: classes.length, firstDate: first, lastDate: last };
}

export function clubFromFacility(f: RawFacility, stats: ClubStats): Club {
  const contact = f.facilityContact;
  const name = clubName(f);
  const place = placeOf(f);
  return {
    id: String(f.facilityId),
    slug: slugify(name),
    name,
    fullName: squash(f.name) || name,
    // A few clubs have shortName "Equinox X", which defeats the point of a short label.
    shortName: stripBrand(f.shortName) || name,
    city: place.city.slug,
    area: place.area?.slug ?? null,
    town: place.town,
    timeZone: ianaTimeZone(f.timeZone),
    clubType: orNull(f.clubType),
    address: orNull(contact?.address),
    lat: coord(contact?.latitude),
    lon: coord(contact?.longitude),
    classCount: stats.classCount,
    firstDate: stats.firstDate,
    lastDate: stats.lastDate,
  };
}

/** Throws if two clubs (or two areas) share a slug; slugs are used in share links. */
export function assertUniqueSlugs(clubs: readonly Club[]): void {
  const seen = new Map<string, Club>();
  const dupes: string[] = [];
  for (const c of clubs) {
    const prev = seen.get(c.slug);
    if (prev) dupes.push(`"${c.slug}": ${prev.id} ${prev.fullName} / ${c.id} ${c.fullName}`);
    else seen.set(c.slug, c);
  }
  if (dupes.length) throw new Error(`Duplicate club slugs (fix clubName/slug rules in downloader/transform.ts): ${dupes.join("; ")}`);
}

/**
 * Cities (most clubs first, then name) with their areas (most clubs first,
 * then name; clubs by name), and every club in display order: grouped by area
 * in `areas` order, clubs without an area last.
 */
export function buildCities(entries: readonly { club: Club; place: Place }[]): { cities: City[]; clubs: Club[] } {
  interface CityAcc {
    name: string;
    areas: Map<string, { name: string; clubs: Club[] }>;
    loose: Club[];
    size: number;
  }
  const cities = new Map<string, CityAcc>();
  for (const { club, place } of entries) {
    let city = cities.get(place.city.slug);
    if (!city) cities.set(place.city.slug, (city = { name: place.city.name, areas: new Map(), loose: [], size: 0 }));
    city.size++;
    if (!place.area) {
      city.loose.push(club);
      continue;
    }
    const area = city.areas.get(place.area.slug) ?? { name: place.area.name, clubs: [] };
    area.clubs.push(club);
    city.areas.set(place.area.slug, area);
  }
  const byClubName = (a: Club, b: Club) => byName(a.name, b.name) || byName(a.id, b.id);
  const outCities: City[] = [];
  const outClubs: Club[] = [];
  const citySlugs = [...cities.keys()].sort((a, b) => {
    const x = cities.get(a) as CityAcc;
    const y = cities.get(b) as CityAcc;
    return y.size - x.size || byName(x.name, y.name);
  });
  for (const slug of citySlugs) {
    const city = cities.get(slug) as CityAcc;
    const areas: Area[] = [...city.areas]
      .sort(([, a], [, b]) => b.clubs.length - a.clubs.length || byName(a.name, b.name))
      .map(([areaSlug, a]) => ({ slug: areaSlug, name: a.name, clubIds: a.clubs.sort(byClubName).map((c) => c.id) }));
    const ordered = [...areas.flatMap((a) => a.clubIds), ...city.loose.sort(byClubName).map((c) => c.id)];
    outCities.push({ slug, name: city.name, areas, clubIds: ordered });
    const byId = new Map(entries.filter((e) => e.place.city.slug === slug).map((e) => [e.club.id, e.club]));
    for (const id of ordered) outClubs.push(byId.get(id) as Club);
  }
  return { cities: outCities, clubs: outClubs };
}

// --- classes ------------------------------------------------------------------

/** "First Last" with stray whitespace removed; null when both parts are empty. */
export function personName(p: RawPerson | null | undefined): string | null {
  if (!p) return null;
  return [p.firstName, p.lastName].map(squash).filter(Boolean).join(" ") || null;
}

/**
 * Nearly every class has one instructor slot. Co-taught classes (~0.3%) have
 * two, and the API's order flips between occurrences, so all names are sorted
 * and joined with " & " rather than keeping only instructors[0].
 */
function joinPeople(people: (RawPerson | null | undefined)[]): string | null {
  const names = [...new Set(people.map(personName).filter((n): n is string => n !== null))].sort(byName);
  return names.length ? names.join(" & ") : null;
}

export function toClassItem(raw: RawClass): ClassItem {
  const slots = raw.instructors ?? [];
  const name = squash(raw.name);
  const item: ClassItem = {
    classInstanceId: raw.classInstanceId,
    classId: raw.classId,
    name,
    family: familyOf(name).key,
    workoutCategoryId: raw.workoutCategoryId,
    startLocal: raw.startLocal,
    endLocal: raw.endLocal,
    startDate: raw.startDate,
    instructor: joinPeople(slots.map((s) => s?.instructor)),
    substitute: joinPeople(slots.map((s) => s?.substitute)),
    studioName: orNull(raw.studioName),
    classLevel: orNull(raw.classLevel?.content),
  };
  if (raw.status?.isCancelled === true) item.isCancelled = true;
  const label = raw.label?.name;
  if (label === "New" || label === "Updated") item.label = label;
  return item;
}

/** Sort by startLocal, then name (then id, so the order is fully deterministic). */
export function compareClasses(a: ClassItem, b: ClassItem): number {
  if (a.startLocal !== b.startLocal) return a.startLocal < b.startLocal ? -1 : 1;
  return byName(a.name, b.name) || a.classInstanceId - b.classInstanceId;
}

const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isUsable(raw: RawClass): boolean {
  return (
    Number.isInteger(raw.classInstanceId) &&
    Number.isInteger(raw.classId) &&
    typeof raw.name === "string" &&
    squash(raw.name) !== "" &&
    typeof raw.startLocal === "string" &&
    LOCAL_RE.test(raw.startLocal) &&
    typeof raw.endLocal === "string" &&
    LOCAL_RE.test(raw.endLocal) &&
    typeof raw.startDate === "string" &&
    typeof raw.workoutCategoryId === "number"
  );
}

export interface ClubClasses {
  classes: ClassItem[];
  descriptions: Record<string, string>;
  /** Same classInstanceId seen more than once (dropped). */
  duplicates: number;
  /** Missing id/name/times (dropped). */
  invalid: number;
  /** Belonging to a different facility than requested (dropped). */
  foreign: number;
  /** classInstanceIds Equinox labels "Special_Event" (not in the schema; used by the report). */
  specialEventIds: Set<number>;
}

/** All of one club's raw classes -> sorted, de-duplicated ClassItems + descriptions. */
export function transformClubClasses(raws: readonly RawClass[], facilityId: string): ClubClasses {
  const seen = new Set<number>();
  const kept: RawClass[] = [];
  let duplicates = 0;
  let invalid = 0;
  let foreign = 0;
  for (const raw of raws) {
    const fid = raw.facility?.facilityId;
    if (fid != null && String(fid) !== facilityId) foreign++;
    else if (!isUsable(raw)) invalid++;
    else if (seen.has(raw.classInstanceId)) duplicates++;
    else {
      seen.add(raw.classInstanceId);
      kept.push(raw);
    }
  }
  const classes = kept.map(toClassItem).sort(compareClasses);
  const specialEventIds = new Set(kept.filter((r) => r.label?.name === "Special_Event").map((r) => r.classInstanceId));
  return { classes, descriptions: descriptionsOf(kept), duplicates, invalid, foreign, specialEventIds };
}

/** classId -> most common non-empty (trimmed) description among the given classes. */
export function descriptionsOf(raws: readonly RawClass[]): Record<string, string> {
  const counts = new Map<number, Map<string, number>>();
  for (const raw of raws) {
    const text = (raw.classDescription ?? "").trim();
    if (!text) continue;
    let m = counts.get(raw.classId);
    if (!m) counts.set(raw.classId, (m = new Map()));
    increment(m, text);
  }
  const out: Record<string, string> = {};
  for (const id of [...counts.keys()].sort(byNumber)) {
    const best = mostCommon(counts.get(id) ?? new Map<string, number>(), byName);
    if (best) out[String(id)] = best;
  }
  return out;
}

// --- index-wide aggregates ----------------------------------------------------

/** Official categories present in the data, in Equinox's order; unknown ids appended as "Other". */
export function buildCategories(categoryIds: Iterable<number>, warn: (msg: string) => void): Category[] {
  const present = new Set(categoryIds);
  const known = new Set(CATEGORIES.map((c) => c.id));
  const out: Category[] = CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ id: c.id, name: c.name, slug: slugify(c.name) }));
  for (const id of [...present].filter((id) => !known.has(id)).sort(byNumber)) {
    warn(`unknown workoutCategoryId ${id}; listed as category "Other" (add it to CATEGORIES in apis/equinox.ts)`);
    out.push({ id, name: "Other", slug: `other-${id}` });
  }
  return out;
}

export function buildFamilies(clubs: readonly { clubId: string; classes: readonly ClassItem[] }[]): ClassFamily[] {
  interface Acc {
    names: Map<string, number>;
    cats: Map<number, number>;
    count: number;
    clubs: Set<string>;
    variants: Map<string, number>;
  }
  const accs = new Map<string, Acc>();
  for (const { clubId, classes } of clubs) {
    for (const c of classes) {
      const fam = familyOf(c.name);
      let acc = accs.get(fam.key);
      if (!acc) accs.set(fam.key, (acc = { names: new Map(), cats: new Map(), count: 0, clubs: new Set(), variants: new Map() }));
      increment(acc.names, fam.name);
      increment(acc.cats, c.workoutCategoryId);
      increment(acc.variants, cleanName(c.name));
      acc.count++;
      acc.clubs.add(clubId);
    }
  }
  return [...accs]
    .map(([key, acc]): ClassFamily => ({
      key,
      name: mostCommon(acc.names, byName) ?? key,
      categoryId: mostCommon(acc.cats, byNumber) ?? 0,
      count: acc.count,
      clubCount: acc.clubs.size,
      variants: keysByCount(acc.variants, byName),
    }))
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Union of the clubs' class dates; falls back to the requested ranges when there are no classes. */
export function horizonOf(
  clubs: readonly Pick<Club, "firstDate" | "lastDate">[],
  ranges: readonly { start: LocalDate; end: LocalDate }[],
): { start: LocalDate; end: LocalDate } {
  const firsts = clubs.map((c) => c.firstDate).filter((d): d is string => d !== null);
  const lasts = clubs.map((c) => c.lastDate).filter((d): d is string => d !== null);
  if (firsts.length && lasts.length) return { start: firsts.sort()[0], end: lasts.sort().at(-1) as string };
  const starts = ranges.map((r) => r.start).sort();
  const ends = ranges.map((r) => r.end).sort();
  return { start: starts[0] ?? "", end: ends.at(-1) ?? "" };
}
