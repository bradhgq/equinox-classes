import { useMemo } from "preact/hooks";
import type { City } from "../../../../../shared/schema.ts";
import { visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";

/**
 * Cities and regions, most clubs first, counting only clubs with classes: the number people see
 * is the number they're sorted by (critique r6 L3). Ties keep the index order.
 */
export function useCitiesBySize(): { city: City; total: number }[] {
  const { catalog, filters } = useFilters();
  return useMemo(
    () =>
      catalog.index.cities
        .map((city) => ({ city, total: visibleIds(filters, catalog, city.clubIds).length }))
        .sort((a, b) => b.total - a.total),
    [catalog, filters.clubs],
  );
}
