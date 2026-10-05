// Turns loaded club schedules + filters into the agenda the Results view shows
// (handoff §5.6), plus the per-family counts the What panel shows.

import type { ClassItem, Club, ClubSchedule } from "../../../shared/schema.ts";
import type { Catalog } from "./catalog.ts";
import { categoryOfClass, makeMatcher } from "./filters/match.ts";
import type { Filters } from "./filters/types.ts";
import { addDays, dateOf } from "./time.ts";

export interface ResultItem {
  c: ClassItem;
  club: Club;
}

export interface DayBucket {
  date: string; // club-local date
  items: ResultItem[];
  /** Clubs whose published schedule ended the day before this one. */
  horizonEnds: Club[];
}

export interface Results {
  days: DayBucket[];
  count: number; // cancelled classes are shown but not counted
  multiClub: boolean;
  multiZone: boolean;
}

export function buildResults(catalog: Catalog, filters: Filters, schedules: readonly ClubSchedule[], nowMs: number): Results {
  const match = makeMatcher(filters, catalog, nowMs);
  const items: ResultItem[] = [];
  const clubs: Club[] = [];
  for (const s of schedules) {
    const club = catalog.clubs.get(s.clubId);
    if (!club) continue;
    clubs.push(club);
    for (const c of s.classes) if (match(c)) items.push({ c, club });
  }
  items.sort(
    (a, b) =>
      a.c.startLocal.localeCompare(b.c.startLocal) ||
      a.club.shortName.localeCompare(b.club.shortName) ||
      a.c.name.localeCompare(b.c.name),
  );

  const byDate = new Map<string, ResultItem[]>();
  for (const item of items) {
    const d = dateOf(item.c.startLocal);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(item);
  }

  // "Schedule published through …" notes for clubs that end before the others.
  const lastDate = clubs.reduce((max, c) => (c.lastDate && c.lastDate > max ? c.lastDate : max), "");
  const endsBefore = new Map<string, Club[]>();
  for (const club of clubs) {
    if (!club.lastDate || club.lastDate >= lastDate) continue;
    const dayAfter = addDays(club.lastDate, 1);
    if (!endsBefore.has(dayAfter)) endsBefore.set(dayAfter, []);
    endsBefore.get(dayAfter)!.push(club);
  }

  const dates = [...byDate.keys()];
  const days: DayBucket[] = dates.map((date) => ({
    date,
    items: byDate.get(date)!,
    // Attach a note to the first shown day on/after the day the club stops.
    horizonEnds: [...endsBefore.entries()]
      .filter(([after]) => after <= date && !dates.some((d) => d >= after && d < date))
      .flatMap(([, cs]) => cs),
  }));

  return {
    days,
    count: items.filter((i) => !i.c.isCancelled).length,
    multiClub: clubs.length > 1,
    multiZone: new Set(clubs.map((c) => c.timeZone)).size > 1,
  };
}

/** Per-family and per-category class counts at the given clubs (for "N/WK" and chip visibility). */
export function classCounts(catalog: Catalog, schedules: readonly ClubSchedule[]) {
  const families = new Map<string, number>();
  const categories = new Map<number, number>();
  for (const s of schedules) {
    for (const c of s.classes) {
      families.set(c.family, (families.get(c.family) ?? 0) + 1);
      const cat = categoryOfClass(catalog, c);
      categories.set(cat, (categories.get(cat) ?? 0) + 1);
    }
  }
  return { families, categories };
}

/** "Serena Tom (sub for Michael Gervais)", "Erin Ay", or "Instructor TBA". */
export function instructorText(item: ResultItem): string {
  const { instructor, substitute } = item.c;
  if (substitute) return instructor ? `${substitute} (sub for ${instructor})` : substitute;
  return instructor ?? "Instructor TBA";
}

/** The row's data-focus-key, so the class detail can hand focus back to it on close. */
export const rowFocusKey = (item: ResultItem) => `class-${item.club.id}-${item.c.classInstanceId}`;

/** "9/WK", "<1/WK" */
export function perWeekLabel(count: number, weeks: number): string {
  const n = count / weeks;
  return n < 1 ? "<1/wk" : `${Math.round(n)}/wk`;
}
