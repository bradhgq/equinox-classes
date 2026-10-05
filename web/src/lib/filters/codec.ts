// Filters <-> short, readable query string (handoff §7). The same canonical
// string is used for share links and for the `eqxc` cookie.
//
//   ?city=boston&area=new-york-downtown&club=hudson-yards
//    &day=mo,we,sa&time=6-9,17-20&sa=9-13&cat=yoga&class=beats-ride
//
// Where: `city` = every club of that city ticked, `area` = every club of that
// area, `club` = individual clubs. What: omitted = any class (the default);
// `cat` = whole categories, `class` = individual families.

import { type Catalog, groupsOfCity } from "../catalog.ts";
import { type TimeRange, sortRanges } from "../ranges.ts";
import { DAY_CODES } from "../time.ts";
import { EMPTY_FILTERS, type Filters, withItem } from "./types.ts";
import { categoryIds, familiesOfCategory, isAnyClass } from "./what.ts";
import { tickedIn, visibleIds } from "./where.ts";

const KNOWN_PARAMS = ["city", "area", "club", "day", "time", ...DAY_CODES, "cat", "class"];

/** 360 -> "6", 390 -> "6:30", 1035 -> "17:15" */
export function formatUrlTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}:${String(m).padStart(2, "0")}` : String(h);
}

export function parseUrlTime(text: string): number | null {
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  return Number(m[2] ?? 0) < 60 && minutes <= 24 * 60 ? minutes : null;
}

export function formatRanges(ranges: readonly TimeRange[]): string {
  return sortRanges(ranges)
    .map((r) => `${formatUrlTime(r.start)}-${formatUrlTime(r.end)}`)
    .join(",");
}

export function parseRanges(text: string): TimeRange[] {
  const out: TimeRange[] = [];
  for (const part of text.split(",")) {
    const [a, b] = part.split("-");
    const start = a === undefined ? null : parseUrlTime(a);
    const end = b === undefined ? null : parseUrlTime(b);
    if (start !== null && end !== null && start < end) out.push({ start, end });
  }
  return sortRanges(out);
}

/** Keep slugs and times readable; percent-encode anything else. */
const encodeValue = (v: string) => v.replace(/[^a-z0-9:\-,]/gi, (ch) => encodeURIComponent(ch));

// --- encode ---------------------------------------------------------------------

function encodeWhere(f: Filters, catalog: Catalog, put: (k: string, v: string[]) => void) {
  const cities: string[] = [];
  const areas: string[] = [];
  const clubs: string[] = [];
  // Whole city / area (2+ clubs, all ticked); a single club is clearer as `club=`.
  const allTicked = (ids: readonly string[]) => {
    const visible = visibleIds(f, catalog, ids);
    return visible.length > 1 && visible.every((id) => f.clubs.includes(id));
  };

  for (const city of catalog.index.cities) {
    if (tickedIn(f, city.clubIds).length === 0) continue;
    if (allTicked(city.clubIds)) {
      cities.push(city.slug);
      continue;
    }
    for (const g of groupsOfCity(city)) {
      if (city.areas.length > 0 && allTicked(g.clubIds)) areas.push(g.key);
      else clubs.push(...tickedIn(f, g.clubIds).map((id) => catalog.clubs.get(id)!.slug));
    }
  }
  put("city", cities.sort());
  put("area", areas.sort());
  put("club", clubs.sort());
}

function encodeWhen(f: Filters, put: (k: string, v: string[]) => void) {
  const keyOf = (d: number) => formatRanges(f.ranges[d] ?? []);
  const allDaysAnyTime = f.days.length === 7 && f.days.every((d) => keyOf(d) === "");
  if (f.days.length === 0 || allDaysAnyTime) return;

  put("day", f.days.map((d) => DAY_CODES[d]));
  // `time` carries the range set most days share (ties: earliest day); other days override.
  const counts = new Map<string, number>();
  for (const d of f.days) counts.set(keyOf(d), (counts.get(keyOf(d)) ?? 0) + 1);
  let shared = keyOf(f.days[0]);
  for (const d of f.days) if (counts.get(keyOf(d))! > counts.get(shared)!) shared = keyOf(d);
  if (shared) put("time", [shared]);
  for (const d of f.days) {
    const k = keyOf(d);
    if (k !== shared) put(DAY_CODES[d], [k || "any"]);
  }
}

function encodeWhat(f: Filters, catalog: Catalog, put: (k: string, v: string[]) => void) {
  if (isAnyClass(f, catalog)) return; // the default: nothing to say
  const cats = catalog.index.categories.filter((c) => f.categories.includes(c.id)).map((c) => c.slug);
  const whole = new Set(f.categories.flatMap((id) => familiesOfCategory(catalog, id)));
  put("cat", cats);
  put("class", f.families.filter((k) => !whole.has(k)).sort());
}

/** Canonical query string without the leading "?" ("" when only defaults are set). */
export function encodeFilters(f: Filters, catalog: Catalog): string {
  const parts: string[] = [];
  const put = (key: string, values: string[]) => {
    if (values.length) parts.push(`${key}=${encodeValue(values.join(","))}`);
  };
  encodeWhere(f, catalog, put);
  encodeWhen(f, put);
  encodeWhat(f, catalog, put);
  return parts.join("&");
}

// --- decode ---------------------------------------------------------------------

export interface Decoded {
  filters: Filters;
  /** Values that referred to clubs, classes etc. no longer in the data. */
  dropped: number;
  /** Whether the query contained any filter parameter at all. */
  recognized: boolean;
}

export function decodeFilters(query: string, catalog: Catalog): Decoded {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const list = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  let f: Filters = { ...EMPTY_FILTERS, ranges: {} };
  let dropped = 0;
  const tickAll = (citySlug: string, ids: readonly string[]) => {
    f = { ...f, cities: withItem(f.cities, citySlug), clubs: [...f.clubs, ...visibleIds(f, catalog, ids).filter((id) => !f.clubs.includes(id))] };
  };

  for (const slug of list("city")) {
    const city = catalog.cities.get(slug);
    if (!city) dropped++;
    else tickAll(slug, city.clubIds);
  }
  for (const slug of list("area")) {
    const area = catalog.areas.get(slug);
    const citySlug = catalog.areaCity.get(slug);
    if (!area || !citySlug) dropped++;
    else tickAll(citySlug, area.clubIds);
  }
  for (const slug of list("club")) {
    const club = catalog.clubBySlug.get(slug);
    if (!club) dropped++;
    else f = { ...f, cities: withItem(f.cities, club.city), clubs: withItem(f.clubs, club.id) };
  }

  const days = new Set<number>();
  for (const code of list("day")) {
    const d = (DAY_CODES as readonly string[]).indexOf(code);
    if (d >= 0) days.add(d);
  }
  const shared = parseRanges(params.get("time") ?? "");
  const ranges: Record<number, TimeRange[]> = {};
  for (const d of days) {
    const own = params.get(DAY_CODES[d]);
    ranges[d] = own === null ? shared.map((r) => ({ ...r })) : own === "any" ? [] : parseRanges(own);
  }
  f = { ...f, days: [...days].sort((a, b) => a - b), ranges };

  if (!params.has("cat") && !params.has("class")) {
    f = { ...f, categories: categoryIds(catalog) }; // default: any class
  } else {
    for (const slug of list("cat")) {
      const cat = catalog.categoryBySlug.get(slug);
      if (!cat) dropped++;
      else f = { ...f, categories: withItem(f.categories, cat.id) };
    }
    const whole = new Set(f.categories.flatMap((id) => familiesOfCategory(catalog, id)));
    for (const key of list("class")) {
      if (!catalog.families.has(key)) dropped++;
      else if (!whole.has(key)) f = { ...f, families: withItem(f.families, key) };
    }
  }

  return { filters: f, dropped, recognized: KNOWN_PARAMS.some((k) => params.has(k)) };
}

export function filtersEqual(a: Filters, b: Filters, catalog: Catalog): boolean {
  return encodeFilters(a, catalog) === encodeFilters(b, catalog);
}
