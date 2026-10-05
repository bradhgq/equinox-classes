// Fast lookups over the downloaded index (shared/schema.ts DataIndex).
// Built once per index load; every filter helper takes a Catalog.

import type { Area, Category, City, ClassFamily, Club, DataIndex } from "../../../shared/schema.ts";
import { daysBetween } from "./time.ts";

/** A selectable bucket of clubs: an area, or a whole city that has no areas. */
export interface ClubGroup {
  key: string; // Area.slug, or City.slug for cities without areas
  name: string; // "Downtown" / "Boston"
  citySlug: string;
  clubIds: string[];
}

export interface Catalog {
  index: DataIndex;
  clubs: Map<string, Club>; // by facility id
  clubBySlug: Map<string, Club>;
  cities: Map<string, City>; // by slug
  areas: Map<string, Area>; // by slug
  areaCity: Map<string, string>; // area slug -> city slug
  categories: Map<number, Category>;
  categoryBySlug: Map<string, Category>;
  families: Map<string, ClassFamily>;
  /** Number of weeks the horizon spans, for "N/WK" counts. */
  weeks: number;
}

export function buildCatalog(index: DataIndex): Catalog {
  const areas = new Map<string, Area>();
  const areaCity = new Map<string, string>();
  for (const city of index.cities) {
    for (const area of city.areas) {
      areas.set(area.slug, area);
      areaCity.set(area.slug, city.slug);
    }
  }
  const span = index.horizon.start && index.horizon.end ? daysBetween(index.horizon.start, index.horizon.end) + 1 : 7;
  return {
    index,
    clubs: new Map(index.clubs.map((c) => [c.id, c])),
    clubBySlug: new Map(index.clubs.map((c) => [c.slug, c])),
    cities: new Map(index.cities.map((c) => [c.slug, c])),
    areas,
    areaCity,
    categories: new Map(index.categories.map((c) => [c.id, c])),
    categoryBySlug: new Map(index.categories.map((c) => [c.slug, c])),
    families: new Map(index.families.map((f) => [f.key, f])),
    weeks: Math.max(1, Math.ceil(span / 7)),
  };
}

/** The groups a city's clubs are listed under. */
export function groupsOfCity(city: City): ClubGroup[] {
  if (city.areas.length === 0) {
    return [{ key: city.slug, name: city.name, citySlug: city.slug, clubIds: city.clubIds }];
  }
  return city.areas.map((a) => ({ key: a.slug, name: a.name, citySlug: city.slug, clubIds: a.clubIds }));
}

/** Group key for a club: its area slug, or its city slug when the city has no areas. */
export function groupKeyOfClub(club: Club): string {
  return club.area ?? club.city;
}

/** Category of a family; falls back to undefined for unknown keys. */
export function familyCategory(catalog: Catalog, key: string): number | undefined {
  return catalog.families.get(key)?.categoryId;
}
