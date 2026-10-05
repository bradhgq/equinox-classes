// Human-readable summaries of the filters: the two-line filter-bar cells
// (handoff §5.2) and the one-sentence share text (§7).

import { type Catalog, groupsOfCity } from "../catalog.ts";
import { type TimeRange, sameRanges, sortRanges } from "../ranges.ts";
import { DAY_SHORT, formatRange } from "../time.ts";
import type { Filters } from "./types.ts";
import { familiesOfCategory, isAnyClass, isNoClass } from "./what.ts";
import { tickedIn, visibleIds } from "./where.ts";

export interface Summary {
  /** Nothing chosen: show line1 as a placeholder (or a call to action when `action`). */
  empty: boolean;
  /** Needs the user's attention ("Choose clubs", "No classes"). */
  action?: boolean;
  line1: string;
  line2: string;
}

interface Token {
  label: string; // filter-bar wording ("All Yoga")
  sub?: string; // second line when this is the only token ("All 43 clubs")
  spoken?: string; // share-sentence wording ("Yoga")
}

function fromTokens(tokens: Token[]): Summary {
  const line2 =
    tokens.length === 1 ? (tokens[0].sub ?? "") : tokens.length === 2 ? `+ ${tokens[1].label}` : `+ ${tokens.length - 1} more`;
  return { empty: false, line1: tokens[0].label, line2 };
}

/** "Greenwich Ave and Hudson Yards", "A, B, C and 2 more". */
export function listJoin(items: readonly string[], max = 3): string {
  if (items.length <= 1) return items.join("");
  if (items.length > max) return `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// --- Where --------------------------------------------------------------------------

/** For each city with ticks: the whole city, whole areas, or individual clubs. */
function whereParts(f: Filters, catalog: Catalog) {
  const parts: { city: string; kind: "city" | "area" | "club"; label: string; count: number }[] = [];
  for (const city of catalog.index.cities) {
    const visible = visibleIds(f, catalog, city.clubIds);
    const ticked = tickedIn(f, visible);
    if (ticked.length === 0) continue;
    // A whole city or area reads by its name, unless it's a single club (its own name is clearer).
    if (ticked.length === visible.length && visible.length > 1) {
      parts.push({ city: city.name, kind: "city", label: city.name, count: visible.length });
      continue;
    }
    for (const g of groupsOfCity(city)) {
      const gVisible = visibleIds(f, catalog, g.clubIds);
      const gTicked = tickedIn(f, gVisible);
      if (city.areas.length > 0 && gVisible.length > 1 && gTicked.length === gVisible.length) {
        parts.push({ city: city.name, kind: "area", label: g.name, count: gVisible.length });
      } else {
        for (const id of gTicked) parts.push({ city: city.name, kind: "club", label: catalog.clubs.get(id)?.shortName ?? id, count: 1 });
      }
    }
  }
  return parts;
}

export function whereSummary(f: Filters, catalog: Catalog): Summary {
  const parts = whereParts(f, catalog);
  if (parts.length === 0) return { empty: true, action: true, line1: "Choose clubs", line2: "" };
  return fromTokens(
    parts.map((p) => ({ label: p.label, sub: p.kind === "city" ? `All ${p.count} clubs` : p.kind === "area" ? `${p.count} clubs` : undefined })),
  );
}

// --- When ---------------------------------------------------------------------------

function dayTokens(days: readonly number[]): string[] {
  const set = new Set(days);
  const tokens: { start: number; text: string }[] = [];
  for (let d = 0; d < 7; d++) {
    if (!set.has(d) || set.has((d + 6) % 7)) continue; // only start at the beginning of a run
    let len = 1;
    while (len < 7 && set.has((d + len) % 7)) len++;
    if (len >= 3) tokens.push({ start: d, text: `${DAY_SHORT[d]}–${DAY_SHORT[(d + len - 1) % 7]}` });
    else for (let i = 0; i < len; i++) tokens.push({ start: (d + i) % 7, text: DAY_SHORT[(d + i) % 7] });
  }
  return tokens.sort((a, b) => a.start - b.start).map((t) => t.text);
}

function namedSet(days: readonly number[]): string | null {
  const set = new Set(days);
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (days.length === 2 && set.has(0) && set.has(6)) return "Weekends";
  return null;
}

/** "Mon Wed Sat", "Mon–Fri" (as "Weekdays"), "Fri–Sun", "Every day". */
export function dayListLabel(days: readonly number[]): string {
  return namedSet(days) ?? dayTokens(days).join(" ");
}

export const rangesLabel = (ranges: readonly TimeRange[]) =>
  sortRanges(ranges)
    .map((r) => formatRange(r.start, r.end))
    .join(", ");

type TimesShape = { kind: "any" } | { kind: "same"; ranges: TimeRange[] } | { kind: "vary" };

function timesShape(f: Filters): TimesShape {
  const sets = f.days.map((d) => f.ranges[d] ?? []);
  if (sets.every((s) => s.length === 0)) return { kind: "any" };
  return sets.every((s) => sameRanges(s, sets[0])) ? { kind: "same", ranges: sets[0] } : { kind: "vary" };
}

/** Compact enough for a filter-bar cell: up to two ranges, then "6–9 AM +2". */
function compactRanges(ranges: readonly TimeRange[]): string {
  const sorted = sortRanges(ranges);
  if (sorted.length <= 2) return rangesLabel(sorted);
  return `${formatRange(sorted[0].start, sorted[0].end)} +${sorted.length - 1}`;
}

export function whenSummary(f: Filters): Summary {
  if (f.days.length === 0) return { empty: true, line1: "Any day", line2: "" };
  const shape = timesShape(f);
  const line2 = shape.kind === "any" ? "Any time" : shape.kind === "same" ? compactRanges(shape.ranges) : "Times vary by day";
  return { empty: false, line1: dayListLabel(f.days), line2 };
}

// --- What ---------------------------------------------------------------------------

function whatTokens(f: Filters, catalog: Catalog): Token[] {
  const tokens: Token[] = [];
  for (const cat of catalog.index.categories) {
    if (f.categories.includes(cat.id)) tokens.push({ label: `All ${cat.name}`, spoken: cat.name });
  }
  const whole = new Set(f.categories.flatMap((id) => familiesOfCategory(catalog, id)));
  const names = f.families
    .filter((k) => !whole.has(k))
    .map((k) => catalog.families.get(k)?.name ?? k)
    .sort((a, b) => a.localeCompare(b));
  for (const name of names) tokens.push({ label: name });
  return tokens;
}

export function whatSummary(f: Filters, catalog: Catalog): Summary {
  if (isAnyClass(f, catalog)) return { empty: true, line1: "Any class", line2: "" };
  if (isNoClass(f)) return { empty: true, action: true, line1: "No classes", line2: "Pick some" };
  return fromTokens(whatTokens(f, catalog));
}

// --- Share sentence -------------------------------------------------------------------

/** Where, for a sentence: "New York", "New York (Downtown and Midtown)", "Greenwich Ave and SoHo". */
function wherePhrases(f: Filters, catalog: Catalog): string[] {
  const phrases: string[] = [];
  const parts = whereParts(f, catalog);
  for (const city of new Set(parts.map((p) => p.city))) {
    const mine = parts.filter((p) => p.city === city);
    const areas = mine.filter((p) => p.kind === "area").map((p) => p.label);
    for (const p of mine) if (p.kind !== "area") phrases.push(p.label);
    // Club names stand alone; bare area names need their city to make sense.
    if (areas.length) phrases.push(`${city} (${listJoin(areas, 7)})`);
  }
  return phrases;
}

function daysForSentence(days: readonly number[]): string {
  const named = namedSet(days);
  if (named === "Every day") return "every day";
  if (named) return `on ${named.toLowerCase()}`;
  return `on ${listJoin(dayTokens(days), 7)}`;
}

/** "Equinox classes that fit: Yoga and Beats Ride at Greenwich Ave and Hudson Yards on Mon, Wed and Sat, 6–9 AM." */
/** The search in words: "Yoga at New York (Downtown) on Mon and Wed, 6–9 AM" (empty if nothing is set). */
export function searchPhrase(f: Filters, catalog: Catalog): string {
  const what = isAnyClass(f, catalog) ? [] : whatTokens(f, catalog).map((t) => t.spoken ?? t.label);
  const where = wherePhrases(f, catalog);
  let s = what.length ? listJoin(what) : "";
  if (where.length) s += `${s ? " at " : ""}${listJoin(where)}`;
  if (f.days.length) {
    s += `${s ? " " : ""}${daysForSentence(f.days)}`;
    const shape = timesShape(f);
    if (shape.kind === "same") s += `, ${rangesLabel(shape.ranges)}`;
    if (shape.kind === "vary") s += " (times vary by day)";
  }
  return s;
}

export function shareSentence(f: Filters, catalog: Catalog): string {
  const phrase = searchPhrase(f, catalog);
  return phrase ? `Equinox classes that fit: ${phrase}.` : "Equinox classes that fit.";
}
