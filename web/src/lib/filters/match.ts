// Which classes pass the When and What filters (Where is applied by only
// loading the ticked clubs). Rules: handoff §5.4 / §5.5.

import type { ClassItem } from "../../../../shared/schema.ts";
import { type Catalog, familyCategory } from "../catalog.ts";
import { inRanges } from "../ranges.ts";
import { dateOf, minutesOf, weekdayOf } from "../time.ts";
import type { Filters } from "./types.ts";

export type Matcher = (c: ClassItem) => boolean;

/** A class's category is its family's category, so one club's odd filing still matches. */
export function categoryOfClass(catalog: Catalog, c: ClassItem): number {
  return familyCategory(catalog, c.family) ?? c.workoutCategoryId;
}

export function makeMatcher(f: Filters, catalog: Catalog, nowMs: number): Matcher {
  const days = f.days.length ? new Set(f.days) : null;
  const categories = new Set(f.categories);
  const families = new Set(f.families);

  return (c) => {
    if (Date.parse(c.startDate) <= nowMs) return false; // started classes are hidden
    if (days) {
      const day = weekdayOf(dateOf(c.startLocal));
      if (!days.has(day)) return false;
      const ranges = f.ranges[day];
      if (ranges?.length && !inRanges(minutesOf(c.startLocal), ranges)) return false;
    }
    // Explicit selection: a whole category or an individually ticked family.
    return categories.has(categoryOfClass(catalog, c)) || families.has(c.family);
  };
}
