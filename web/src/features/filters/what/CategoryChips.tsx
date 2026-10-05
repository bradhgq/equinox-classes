import { Chip, ChipGroup } from "../../../components/Chip/Chip.tsx";
import { categoryState, tickedCount, toggleCategory } from "../../../lib/filters/what.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { useResults } from "../../../state/ResultsContext.tsx";

/**
 * Category chips in a fixed order (critique M10): on = the whole category,
 * outlined with a count = some of its classes. Categories with no classes at
 * the chosen clubs are hidden unless something in them is ticked.
 */
export function CategoryChips() {
  const { catalog, filters, update } = useFilters();
  const { counts } = useResults();
  const cats = catalog.index.categories.filter(
    (c) => (counts.categories.get(c.id) ?? 0) > 0 || categoryState(filters, catalog, c.id) !== "off",
  );

  return (
    <ChipGroup label="Categories">
      {cats.map((cat) => {
        const state = categoryState(filters, catalog, cat.id);
        const ticked = tickedCount(filters, catalog, cat.id);
        return (
          <Chip
            key={cat.id}
            state={state}
            count={ticked}
            description={state === "mixed" ? `${ticked} ${ticked === 1 ? "class" : "classes"} selected` : undefined}
            onToggle={() => update((f) => toggleCategory(f, catalog, cat.id))}
          >
            {cat.name}
          </Chip>
        );
      })}
    </ChipGroup>
  );
}
