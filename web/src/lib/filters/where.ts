// Where: city -> area -> club, as explicit ticks (handoff §5.3, owner round 3).
//
// - `clubs` holds the ticked clubs; they are exactly what shows.
// - `cities` holds the cities whose clubs are listed (in play), even with nothing ticked.
// - Group and city "All" states are derived from the ticks: on / mixed / off.
// Clubs with no scheduled classes are left out of totals and bulk ticks.

import type { City } from "../../../../shared/schema.ts";
import { type Catalog, type ClubGroup, groupsOfCity } from "../catalog.ts";
import { type ChipState, type Filters, stateOf, without, withItem } from "./types.ts";

export type { ChipState };

/** Clubs worth listing and bulk-ticking: the ones with classes (plus any already ticked). */
export function visibleIds(f: Filters, catalog: Catalog, ids: readonly string[]): string[] {
  return ids.filter((id) => (catalog.clubs.get(id)?.classCount ?? 0) > 0 || f.clubs.includes(id));
}

export function groupState(f: Filters, catalog: Catalog, group: ClubGroup): ChipState {
  const ids = visibleIds(f, catalog, group.clubIds);
  return stateOf(ids.filter((id) => f.clubs.includes(id)).length, ids.length);
}

export function cityState(f: Filters, catalog: Catalog, city: City): ChipState {
  const ids = visibleIds(f, catalog, city.clubIds);
  return stateOf(ids.filter((id) => f.clubs.includes(id)).length, ids.length);
}

export function tickedIn(f: Filters, ids: readonly string[]): string[] {
  return ids.filter((id) => f.clubs.includes(id));
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

/** Groups listed for the cities in play, in index order. */
export function listedGroups(f: Filters, catalog: Catalog): ClubGroup[] {
  return catalog.index.cities.filter((c) => f.cities.includes(c.slug)).flatMap((c) => groupsOfCity(c));
}

function tick(f: Filters, citySlug: string, ids: readonly string[]): Filters {
  return { ...f, cities: withItem(f.cities, citySlug), clubs: [...f.clubs, ...ids.filter((id) => !f.clubs.includes(id))] };
}

function untick(f: Filters, ids: readonly string[]): Filters {
  const drop = new Set(ids);
  return { ...f, clubs: f.clubs.filter((id) => !drop.has(id)) };
}

/** City chip for a city without areas: nothing ticked -> tick all; otherwise remove the city. */
export function toggleCity(f: Filters, catalog: Catalog, citySlug: string): Filters {
  const city = catalog.cities.get(citySlug);
  if (!city) return f;
  if (cityState(f, catalog, city) === "off") return tick(f, citySlug, visibleIds(f, catalog, city.clubIds));
  return removeCity(f, catalog, citySlug);
}

export function removeCity(f: Filters, catalog: Catalog, citySlug: string): Filters {
  const city = catalog.cities.get(citySlug);
  if (!city) return f;
  return { ...untick(f, city.clubIds), cities: without(f.cities, citySlug) };
}

/** What AreaPopover does per area: tick all, untick all, or leave a partial pick alone. */
export type AreaDecision = "all" | "none" | "keep";

export function applyAreas(f: Filters, catalog: Catalog, citySlug: string, decisions: Record<string, AreaDecision>): Filters {
  const city = catalog.cities.get(citySlug);
  if (!city) return f;
  let next = f;
  for (const area of city.areas) {
    const decision = decisions[area.slug] ?? "keep";
    if (decision === "all") next = tick(next, citySlug, visibleIds(next, catalog, area.clubIds));
    if (decision === "none") next = untick(next, area.clubIds);
  }
  // Nothing left ticked in the city: take it out of play.
  return tickedIn(next, city.clubIds).length ? { ...next, cities: withItem(next.cities, citySlug) } : removeCity(next, catalog, citySlug);
}

export function toggleClub(f: Filters, catalog: Catalog, clubId: string): Filters {
  const club = catalog.clubs.get(clubId);
  if (!club) return f;
  return f.clubs.includes(clubId) ? untick(f, [clubId]) : tick(f, club.city, [clubId]);
}

/** A group's "All" checkbox: all ticked -> untick all; otherwise tick all. The city stays in play. */
export function toggleGroup(f: Filters, catalog: Catalog, group: ClubGroup): Filters {
  return groupState(f, catalog, group) === "on" ? untick(f, group.clubIds) : tick(f, group.citySlug, visibleIds(f, catalog, group.clubIds));
}

export function clearWhere(f: Filters): Filters {
  return { ...f, cities: [], clubs: [] };
}
