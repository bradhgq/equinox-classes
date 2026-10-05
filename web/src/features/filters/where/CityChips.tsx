import { useState } from "preact/hooks";
import { Chip, ChipGroup } from "../../../components/Chip/Chip.tsx";
import { applyAreas, cityState, tickedIn, toggleCity, visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { AreaPopover } from "./AreaPopover.tsx";

interface Props {
  /** Called after a city is added (not removed), e.g. to fold the chips away. */
  onPicked?: () => void;
}

/**
 * One chip per city, most clubs first (owner). Cities with areas open the
 * AreaPopover next to the chip; the others toggle all their clubs directly.
 */
export function CityChips({ onPicked }: Props = {}) {
  const { catalog, filters, update } = useFilters();
  const [popover, setPopover] = useState<{ city: string; anchor: HTMLElement } | null>(null);

  const onChip = (slug: string, el: HTMLElement) => {
    const city = catalog.cities.get(slug)!;
    if (city.areas.length > 0) return setPopover({ city: slug, anchor: el });
    const removing = cityState(filters, catalog, city) !== "off";
    update((f) => toggleCity(f, catalog, slug), removing ? { undoLabel: `Removed ${city.name}` } : undefined);
    if (!removing) onPicked?.();
  };

  const openCity = popover ? catalog.cities.get(popover.city)! : null;

  return (
    <>
      <ChipGroup label="Cities">
        {catalog.index.cities.map((city) => {
          const state = cityState(filters, catalog, city);
          const ticked = tickedIn(filters, visibleIds(filters, catalog, city.clubIds)).length;
          return (
            <Chip
              key={city.slug}
              state={state}
              count={ticked}
              description={state === "mixed" ? `${ticked} clubs selected` : undefined}
              onToggle={(e) => onChip(city.slug, e.currentTarget as HTMLElement)}
            >
              {city.name}
            </Chip>
          );
        })}
      </ChipGroup>
      {openCity && popover && (
        <AreaPopover
          city={openCity}
          anchor={popover.anchor}
          onApply={(decisions) => {
            update((f) => applyAreas(f, catalog, openCity.slug, decisions));
            setPopover(null);
            if (Object.values(decisions).some((d) => d !== "none")) onPicked?.();
          }}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}
