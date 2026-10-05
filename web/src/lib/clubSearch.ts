// Club search for the Where picker (critique r6 M3): every query word must start a word in the
// club's name, town, area or city. Name matches rank first, the town shows when it explains a
// match, and a few shorthand names work ("nyc", "la").

import type { Club } from "../../../shared/schema.ts";
import type { Catalog } from "./catalog.ts";

/** Shorthand people type for the places Equinox names in full. */
const ALIASES: Record<string, string> = {
  nyc: "new york",
  la: "los angeles",
  sf: "san francisco",
  dc: "washington dc",
  oc: "orange county",
};

/** Case- and accent-insensitive: "Soho" finds "SoHo", "cote" finds "Côte". */
export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const wordsOf = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);

export interface ClubHit {
  club: Club;
  /** "Greenvale · New York · Long Island": where it is, with the town when the name doesn't say it. */
  place: string;
}

export interface ClubSearchResult {
  hits: ClubHit[];
  /** Clubs that match but have no classes on the schedule (so they aren't offered). */
  withoutClasses: Club[];
}

export function placeOf(catalog: Catalog, club: Club): string {
  const city = catalog.cities.get(club.city)?.name ?? "";
  const area = club.area ? (catalog.areas.get(club.area)?.name ?? null) : null;
  const town = club.town && !normalize(club.name).includes(normalize(club.town)) && club.town !== city && club.town !== area ? club.town : null;
  return [town, city, area].filter(Boolean).join(" · ");
}

/** 0: the name starts with the query; 1: every word starts a word of the name; 2: of town, area or city. */
function rankOf(catalog: Catalog, club: Club, query: string): number | null {
  const q = wordsOf(query);
  if (q.length === 0) return null;
  const name = [...wordsOf(club.name), ...wordsOf(club.shortName)];
  if (normalize(club.name).startsWith(q.join(" ")) || normalize(club.shortName).startsWith(q.join(" "))) return 0;
  const startsOne = (words: string[]) => q.every((w) => words.some((x) => x.startsWith(w)));
  if (startsOne(name)) return 1;
  const city = catalog.cities.get(club.city)?.name ?? "";
  const area = club.area ? (catalog.areas.get(club.area)?.name ?? "") : "";
  return startsOne([...name, ...wordsOf(club.town ?? ""), ...wordsOf(area), ...wordsOf(city)]) ? 2 : null;
}

export function searchClubs(catalog: Catalog, query: string, picked: readonly string[]): ClubSearchResult {
  const queries = [query, ALIASES[normalize(query.trim())]].filter((q): q is string => !!q);
  const ranked: { club: Club; rank: number }[] = [];
  const withoutClasses: Club[] = [];
  for (const club of catalog.index.clubs) {
    const ranks = queries.map((q) => rankOf(catalog, club, q)).filter((r): r is number => r !== null);
    if (ranks.length === 0) continue;
    if (club.classCount > 0 || picked.includes(club.id)) ranked.push({ club, rank: Math.min(...ranks) });
    else withoutClasses.push(club);
  }
  ranked.sort((a, b) => a.rank - b.rank || a.club.name.localeCompare(b.club.name));
  return { hits: ranked.map(({ club }) => ({ club, place: placeOf(catalog, club) })), withoutClasses };
}
