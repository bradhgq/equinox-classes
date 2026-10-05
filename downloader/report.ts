// Class-name analysis report (data/reports/class-names.{json,md}). Not read by
// the web app: it exists to curate COLLAPSE_PREFIXES in shared/families.ts,
// i.e. to tell one-off "Prefix: Title" specials ("THEME RIDE: Charli XCX x
// Rufus Du Sol") from stable formats ("Rounds: Boxing", "Swim: Pro").

import type { ClassItem, LocalDate } from "../shared/schema.ts";
import { cleanName, COLLAPSE_PREFIXES, familyOf, prefixOf, slugify } from "../shared/families.ts";
import { weekStart } from "./dates.ts";
import { byName, increment, keysByCount, mostCommon } from "./transform.ts";

export interface VariantStats {
  name: string; // most common cleaned spelling of the full name
  variant: string; // the part after "Prefix:"
  spellings?: string[]; // other cleaned spellings folded in (case/® differences)
  count: number;
  clubCount: number;
  instructorCount: number; // distinct people teaching it (the sub when one covers)
  weekCount: number; // distinct Sunday-Saturday weeks it is scheduled in
  weeks: LocalDate[]; // those weeks' Sundays
  specialEvent: number; // occurrences Equinox labels "Special_Event"
  exampleClubs: string[]; // up to 5 club names, most occurrences first
}

export interface PrefixStats {
  prefix: string; // most common spelling
  spellings?: string[];
  collapsedTo: string | null; // family name if COLLAPSE_PREFIXES already folds this prefix
  variantCount: number;
  count: number;
  clubCount: number;
  oneWeekVariants: number; // variants scheduled in a single week (one-off signal)
  oneClubVariants: number; // variants scheduled at a single club
  specialEvent: number; // classes Equinox labels "Special_Event"
  variants: VariantStats[];
}

export interface NameStats {
  name: string; // ClassItem.name (whitespace-normalised, marks kept)
  count: number;
  clubCount: number;
  categoryId: number;
  category: string;
  family: string;
  prefix: string | null;
  specialEvent: number;
}

export interface ClassNameReport {
  generatedAt: string;
  horizon: { start: LocalDate; end: LocalDate };
  weeks: LocalDate[]; // every week (Sunday) present in the data, for reading weekCount
  totals: { classes: number; distinctNames: number; prefixes: number; prefixedNames: number };
  prefixes: PrefixStats[]; // most variants first
  names: NameStats[]; // most classes first
}

export interface ReportClub {
  clubId: string;
  clubName: string;
  classes: readonly ClassItem[];
  /** classInstanceIds labelled "Special_Event" in the raw data. */
  specialEventIds?: ReadonlySet<number>;
}

interface Occurrence {
  clubName: string;
  teacher: string | null;
  week: LocalDate;
  special: boolean;
}

export function buildClassNameReport(
  clubs: readonly ReportClub[],
  categoryName: (id: number) => string,
  generatedAt: string,
  horizon: { start: LocalDate; end: LocalDate },
): ClassNameReport {
  // Group occurrences by variant key (case/®-insensitive full name).
  const variants = new Map<string, { spellings: Map<string, number>; occ: Occurrence[] }>();
  const names = new Map<string, { count: number; clubs: Set<string>; cats: Map<number, number>; special: number }>();
  const allWeeks = new Set<LocalDate>();
  let total = 0;
  for (const club of clubs) {
    for (const c of club.classes) {
      total++;
      const week = weekStart(c.startLocal.slice(0, 10));
      const special = club.specialEventIds?.has(c.classInstanceId) ?? false;
      allWeeks.add(week);
      const n = names.get(c.name) ?? { count: 0, clubs: new Set<string>(), cats: new Map<number, number>(), special: 0 };
      n.count++;
      if (special) n.special++;
      n.clubs.add(club.clubId);
      increment(n.cats, c.workoutCategoryId);
      names.set(c.name, n);
      const prefix = prefixOf(c.name);
      if (prefix === null) continue;
      const key = `${prefix.toLowerCase()}|${slugify(c.name)}`;
      const v = variants.get(key) ?? { spellings: new Map<string, number>(), occ: [] };
      increment(v.spellings, cleanName(c.name));
      v.occ.push({ clubName: club.clubName, teacher: c.substitute ?? c.instructor, week, special });
      variants.set(key, v);
    }
  }

  // Fold variants into prefixes.
  const prefixes = new Map<string, { spellings: Map<string, number>; variants: VariantStats[]; clubs: Set<string> }>();
  for (const v of variants.values()) {
    const name = mostCommon(v.spellings, byName) ?? "";
    const prefix = prefixOf(name) ?? name;
    const clubCounts = new Map<string, number>();
    for (const o of v.occ) increment(clubCounts, o.clubName);
    const weeks = [...new Set(v.occ.map((o) => o.week))].sort();
    const stats: VariantStats = {
      name,
      variant: name.slice(name.indexOf(":") + 1).trim(),
      ...(v.spellings.size > 1 && { spellings: keysByCount(v.spellings, byName).filter((s) => s !== name) }),
      count: v.occ.length,
      clubCount: clubCounts.size,
      instructorCount: new Set(v.occ.map((o) => o.teacher).filter((t) => t !== null)).size,
      weekCount: weeks.length,
      weeks,
      specialEvent: v.occ.filter((o) => o.special).length,
      exampleClubs: keysByCount(clubCounts, byName).slice(0, 5),
    };
    const pkey = prefix.toLowerCase();
    const p = prefixes.get(pkey) ?? { spellings: new Map<string, number>(), variants: [], clubs: new Set<string>() };
    for (const [spelling, n] of v.spellings) increment(p.spellings, prefixOf(spelling) ?? prefix, n);
    p.variants.push(stats);
    for (const club of clubCounts.keys()) p.clubs.add(club);
    prefixes.set(pkey, p);
  }

  const prefixStats: PrefixStats[] = [...prefixes].map(([pkey, p]) => {
    const prefix = mostCommon(p.spellings, byName) ?? pkey;
    p.variants.sort((a, b) => b.count - a.count || byName(a.name, b.name));
    return {
      prefix,
      ...(p.spellings.size > 1 && { spellings: keysByCount(p.spellings, byName).filter((s) => s !== prefix) }),
      collapsedTo: COLLAPSE_PREFIXES[pkey] ?? null,
      variantCount: p.variants.length,
      count: p.variants.reduce((sum, v) => sum + v.count, 0),
      clubCount: p.clubs.size,
      oneWeekVariants: p.variants.filter((v) => v.weekCount === 1).length,
      oneClubVariants: p.variants.filter((v) => v.clubCount === 1).length,
      specialEvent: p.variants.reduce((sum, v) => sum + v.specialEvent, 0),
      variants: p.variants,
    };
  });
  prefixStats.sort((a, b) => b.variantCount - a.variantCount || b.count - a.count || byName(a.prefix, b.prefix));

  const nameStats: NameStats[] = [...names].map(([name, n]) => {
    const categoryId = mostCommon(n.cats, (a, b) => a - b) ?? 0;
    return {
      name,
      count: n.count,
      clubCount: n.clubs.size,
      categoryId,
      category: categoryName(categoryId),
      family: familyOf(name).key,
      prefix: prefixOf(name),
      specialEvent: n.special,
    };
  });
  nameStats.sort((a, b) => b.count - a.count || byName(a.name, b.name));

  return {
    generatedAt,
    horizon,
    weeks: [...allWeeks].sort(),
    totals: {
      classes: total,
      distinctNames: nameStats.length,
      prefixes: prefixStats.length,
      prefixedNames: nameStats.filter((n) => n.prefix !== null).length,
    },
    prefixes: prefixStats,
    names: nameStats,
  };
}

const cell = (s: string) => s.replace(/\|/g, "\\|");

/** A one-table summary for skimming; the JSON has the per-variant detail. */
export function renderClassNameReportMarkdown(r: ClassNameReport): string {
  const lines = [
    "# Class-name prefixes",
    "",
    `Generated ${r.generatedAt} from ${r.totals.classes} classes, ${r.horizon.start} to ${r.horizon.end} ` +
      `(${r.weeks.length} Sunday-Saturday weeks; the first and last may be partial). ` +
      `${r.totals.distinctNames} distinct names, ${r.totals.prefixedNames} of them "Prefix: Variant" under ${r.totals.prefixes} prefixes.`,
    "",
    "Read: a prefix whose variants mostly appear in one week and at one club is a one-off title (collapse it in",
    "shared/families.ts COLLAPSE_PREFIXES); variants that recur every week at many clubs are stable formats.",
    'Equinox itself labels some classes "Special_Event" (intro sessions, anniversaries, holidays); that count is shown too.',
    "Per-variant detail (instructors, weeks, example clubs) and every distinct name are in class-names.json.",
    "",
    "| Prefix | Variants | Classes | Clubs | 1-week variants | 1-club variants | Special-event classes | Collapsed to | Top variants (classes/clubs/weeks) |",
    "|---|---:|---:|---:|---:|---:|---:|---|---|",
  ];
  for (const p of r.prefixes) {
    const top = p.variants
      .slice(0, 4)
      .map((v) => `${v.variant || "(empty)"} ${v.count}/${v.clubCount}/${v.weekCount}`)
      .join("; ");
    const more = p.variantCount > 4 ? `; +${p.variantCount - 4} more` : "";
    lines.push(
      `| ${cell(p.prefix)} | ${p.variantCount} | ${p.count} | ${p.clubCount} | ${p.oneWeekVariants} | ${p.oneClubVariants} | ${p.specialEvent} | ${cell(p.collapsedTo ?? "")} | ${cell(top + more)} |`,
    );
  }
  return lines.join("\n") + "\n";
}
