// The filter model. Plain data, so it can be compared, encoded into share links
// (codec.ts) and stored in the cookie.
//
// Selection is explicit (owner feedback): what's ticked is what shows. "All" in a
// group is just a shortcut that ticks or unticks everything in it.

import type { TimeRange } from "../ranges.ts";

export interface Filters {
  /** Cities in play: their clubs are listed under Where (in play with nothing ticked is fine). */
  cities: string[];
  /** Ticked club ids: exactly the clubs whose classes show. */
  clubs: string[];
  /** Selected weekdays, Sunday = 0, ascending. Empty = any day. */
  days: number[];
  /** Ranges per selected day. Missing or empty = any time that day. */
  ranges: Record<number, TimeRange[]>;
  /** Whole categories: every family in them, including ones that appear later. */
  categories: number[];
  /** Individually ticked families whose category isn't whole. */
  families: string[];
}

/** Nothing selected anywhere. (The app's default for What is "every category", set by the codec.) */
export const EMPTY_FILTERS: Filters = {
  cities: [],
  clubs: [],
  days: [],
  ranges: {},
  categories: [],
  families: [],
};

/** Derived state of a city, area or category: none, all, or some of it ticked. */
export type ChipState = "off" | "on" | "mixed";

export function stateOf(ticked: number, total: number): ChipState {
  if (ticked === 0) return "off";
  return ticked >= total ? "on" : "mixed";
}

export function hasWhen(f: Filters): boolean {
  return f.days.length > 0;
}

/** Remove a value from a list, returning a new list. */
export const without = <T>(list: readonly T[], value: T): T[] => list.filter((x) => x !== value);

/** Add a value to a list if it isn't there yet, returning a new list. */
export const withItem = <T>(list: readonly T[], value: T): T[] => (list.includes(value) ? [...list] : [...list, value]);
