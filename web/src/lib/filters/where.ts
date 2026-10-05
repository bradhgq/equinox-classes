// Where: the clubs you pick (owner round 6, docs/design/05-where-flow.md).
//
// - `clubs` holds the ticked clubs; they are exactly what shows.
// - Cities and areas only help you find clubs. Picking a whole area or city is an explicit
//   "Select all", never a side effect of looking at one.
// Clubs with no scheduled classes are left out of totals and bulk picks.

import type { City } from "../../../../shared/schema.ts";
import { type Catalog, type ClubGroup, groupKeyOfClub, groupsOfCity } from "../catalog.ts";
import type { Filters } from "./types.ts";

/** Clubs worth listing and bulk-picking: the ones with classes (plus any already ticked). */
export function visibleIds(f: Filters, catalog: Catalog, ids: readonly string[]): string[] {
  return ids.filter((id) => (catalog.clubs.get(id)?.classCount ?? 0) > 0 || f.clubs.includes(id));
}

export function tickedIn(f: Filters, ids: readonly string[]): string[] {
  return ids.filter((id) => f.clubs.includes(id));
}

/** Every listed club in the group is picked. */
export function groupAllPicked(f: Filters, catalog: Catalog, group: ClubGroup): boolean {
  const ids = visibleIds(f, catalog, group.clubIds);
  return ids.length > 0 && ids.every((id) => f.clubs.includes(id));
}

/** A pick as "Your clubs" shows it: a whole area (or a city without areas) collapses into one token. */
export type PickToken = { kind: "group"; group: ClubGroup; count: number } | { kind: "club"; id: string };

/** Your picks, newest first (critique r6 M1). A fully picked group of 2+ clubs is one token. */
export function pickTokens(f: Filters, catalog: Catalog): PickToken[] {
  const out: PickToken[] = [];
  const groupsSeen = new Set<string>();
  for (const id of [...f.clubs].reverse()) {
    const club = catalog.clubs.get(id);
    const city = club && catalog.cities.get(club.city);
    if (!club || !city) continue;
    const group = groupsOfCity(city).find((g) => g.key === groupKeyOfClub(club));
    const size = group ? visibleIds(f, catalog, group.clubIds).length : 0;
    if (group && size > 1 && groupAllPicked(f, catalog, group)) {
      if (!groupsSeen.has(group.key)) out.push({ kind: "group", group, count: size });
      groupsSeen.add(group.key);
    } else {
      out.push({ kind: "club", id });
    }
  }
  return out;
}

/** Ticked clubs with classes, in index order (city, then area, then name). */
export function effectiveClubIds(f: Filters, catalog: Catalog): string[] {
  const out: string[] = [];
  for (const city of catalog.index.cities) {
    for (const id of city.clubIds) {
      if (f.clubs.includes(id) && (catalog.clubs.get(id)?.classCount ?? 0) > 0) out.push(id);
    }
  }
  return out;
}

/** The city to show first: where most of your picks are, else the city with the most clubs. */
export function defaultCity(f: Filters, catalog: Catalog): City {
  const cities = catalog.index.cities;
  const picks = (c: City) => tickedIn(f, c.clubIds).length;
  return cities.reduce((best, c) => (picks(c) > picks(best) ? c : best), cities[0]);
}

export function toggleClub(f: Filters, catalog: Catalog, clubId: string): Filters {
  if (!catalog.clubs.has(clubId)) return f;
  return { ...f, clubs: f.clubs.includes(clubId) ? f.clubs.filter((id) => id !== clubId) : [...f.clubs, clubId] };
}

/** "Select all 13": picks every listed club in the group. */
export function selectGroup(f: Filters, catalog: Catalog, group: ClubGroup): Filters {
  return { ...f, clubs: [...f.clubs, ...visibleIds(f, catalog, group.clubIds).filter((id) => !f.clubs.includes(id))] };
}

/** "Clear" on a group: unpicks all its clubs. */
export function clearGroup(f: Filters, group: ClubGroup): Filters {
  const drop = new Set(group.clubIds);
  return { ...f, clubs: f.clubs.filter((id) => !drop.has(id)) };
}

export function clearWhere(f: Filters): Filters {
  return { ...f, clubs: [] };
}
