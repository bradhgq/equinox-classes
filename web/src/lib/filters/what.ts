// What: category -> class family, as explicit ticks (handoff §5.5, owner round 3).
//
// - `categories` are whole: every family in them is ticked, including future ones.
// - `families` are individual ticks in categories that aren't whole.
// - The default is every category ("Any class"); nothing ticked shows nothing.

import { type Catalog, familyCategory } from "../catalog.ts";
import { type ChipState, type Filters, stateOf, without } from "./types.ts";

export const categoryIds = (catalog: Catalog) => catalog.index.categories.map((c) => c.id);

export function familiesOfCategory(catalog: Catalog, categoryId: number): string[] {
  return catalog.index.families.filter((fam) => fam.categoryId === categoryId).map((fam) => fam.key);
}

/** Every category ticked: the default, shown as "Any class". */
export function isAnyClass(f: Filters, catalog: Catalog): boolean {
  return categoryIds(catalog).every((id) => f.categories.includes(id));
}

export function isNoClass(f: Filters): boolean {
  return f.categories.length === 0 && f.families.length === 0;
}

export function allClasses(f: Filters, catalog: Catalog): Filters {
  return { ...f, categories: categoryIds(catalog), families: [] };
}

export function clearWhat(f: Filters): Filters {
  return { ...f, categories: [], families: [] };
}

export function familyTicked(f: Filters, catalog: Catalog, key: string): boolean {
  if (f.families.includes(key)) return true;
  const cat = familyCategory(catalog, key);
  return cat !== undefined && f.categories.includes(cat);
}

/** Chip / group state, judged over the given families (e.g. the ones at your clubs). */
export function categoryState(f: Filters, catalog: Catalog, categoryId: number, keys = familiesOfCategory(catalog, categoryId)): ChipState {
  if (f.categories.includes(categoryId)) return "on";
  return stateOf(keys.filter((k) => f.families.includes(k)).length, keys.length);
}

export function tickedCount(f: Filters, catalog: Catalog, categoryId: number, keys = familiesOfCategory(catalog, categoryId)): number {
  return f.categories.includes(categoryId) ? keys.length : keys.filter((k) => f.families.includes(k)).length;
}

/** Chip or group "All": fully ticked -> untick all; otherwise make the category whole. */
export function toggleCategory(f: Filters, catalog: Catalog, categoryId: number, keys?: string[]): Filters {
  const own = new Set(familiesOfCategory(catalog, categoryId));
  const rest = f.families.filter((k) => !own.has(k));
  if (categoryState(f, catalog, categoryId, keys) === "on") return { ...f, categories: without(f.categories, categoryId), families: rest };
  return { ...f, categories: [...without(f.categories, categoryId), categoryId], families: rest };
}

export function toggleFamily(f: Filters, catalog: Catalog, key: string): Filters {
  const cat = familyCategory(catalog, key);
  if (cat === undefined) return f.families.includes(key) ? { ...f, families: without(f.families, key) } : { ...f, families: [...f.families, key] };
  const siblings = familiesOfCategory(catalog, cat);
  if (f.categories.includes(cat)) {
    // Unticking one family of a whole category: tick the others individually.
    const others = siblings.filter((k) => k !== key);
    return { ...f, categories: without(f.categories, cat), families: [...f.families.filter((k) => !siblings.includes(k)), ...others] };
  }
  if (f.families.includes(key)) return { ...f, families: without(f.families, key) };
  const families = [...f.families, key];
  // Every family ticked again: the category becomes whole (and picks up new families later).
  if (siblings.every((k) => families.includes(k))) {
    return { ...f, categories: [...f.categories, cat], families: families.filter((k) => !siblings.includes(k)) };
  }
  return { ...f, families };
}
