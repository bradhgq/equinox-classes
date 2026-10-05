import type { Catalog } from "../../lib/catalog.ts";
import type { Filters } from "../../lib/filters/types.ts";
import { allClasses, clearWhat, isNoClass } from "../../lib/filters/what.ts";
import { clearWhen } from "../../lib/filters/when.ts";
import { clearWhere, effectiveClubIds } from "../../lib/filters/where.ts";
import type { FilterName } from "./useSummaries.ts";

/** "Clear" in a sheet footer or rail panel empties only that filter (critique M9 p). */
export function clearFilter(f: Filters, which: FilterName): Filters {
  if (which === "where") return clearWhere(f);
  if (which === "when") return clearWhen(f);
  return clearWhat(f);
}

export const CLEAR_LABEL: Record<FilterName, string> = {
  where: "Cleared clubs",
  when: "Cleared days",
  what: "Cleared classes",
};

/** A filter with nothing picked can't show anything (owner round 3: grey out "Show"). */
export function nothingPicked(f: Filters, catalog: Catalog, which: FilterName): boolean {
  if (which === "where") return effectiveClubIds(f, catalog).length === 0;
  if (which === "what") return isNoClass(f);
  return false;
}

export { allClasses };
