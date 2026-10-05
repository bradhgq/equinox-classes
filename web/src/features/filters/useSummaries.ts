import { useMemo } from "preact/hooks";
import { type Summary, whatSummary, whenSummary, whereSummary } from "../../lib/filters/summary.ts";
import { useFilters } from "../../state/FiltersContext.tsx";

export type FilterName = "where" | "when" | "what";

export const FILTER_TITLES: Record<FilterName, string> = { where: "Where", when: "When", what: "What" };

/** Two-line summaries for the filter bar and rail panel headers. */
export function useSummaries(): Record<FilterName, Summary> {
  const { catalog, filters } = useFilters();
  return useMemo(
    () => ({
      where: whereSummary(filters, catalog),
      when: whenSummary(filters),
      what: whatSummary(filters, catalog),
    }),
    [filters, catalog],
  );
}
