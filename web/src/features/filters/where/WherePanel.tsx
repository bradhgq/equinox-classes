import { useState } from "preact/hooks";
import { Button } from "../../../components/Button/Button.tsx";
import { SearchField } from "../../../components/SearchField/SearchField.tsx";
import { SectionLabel } from "../../../components/SectionLabel/SectionLabel.tsx";
import { useKeyboardOpen } from "../../../hooks/useKeyboardOpen.ts";
import { effectiveClubIds, visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { CityChips } from "./CityChips.tsx";
import { ClubList } from "./ClubList.tsx";
import styles from "./WherePanel.module.css";

const SEARCH_THRESHOLD = 12;

/** Where: city chips (with area popover), then the foldable club list (handoff §5.3). */
export function WherePanel() {
  const { catalog, filters } = useFilters();
  // A returning member rarely changes city: start with the city block collapsed (critique M10).
  const [citiesOpen, setCitiesOpen] = useState(() => filters.cities.length === 0);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  // Club search gets the same search mode as class search (critique M5).
  const searching = query.trim().length > 0 || (focused && keyboardOpen);

  const cities = catalog.index.cities.filter((c) => filters.cities.includes(c.slug));
  const clubTotal = cities.flatMap((c) => visibleIds(filters, catalog, c.clubIds)).length;
  const chosen = effectiveClubIds(filters, catalog).length;

  return (
    <div>
      {!searching && (
        <>
          <SectionLabel
            right={
              !citiesOpen && (
                <Button variant="text" size="sm" onClick={() => setCitiesOpen(true)}>
                  Change
                </Button>
              )
            }
          >
            City
          </SectionLabel>
          {citiesOpen || cities.length === 0 ? (
            // Once a city is picked, fold the chips so the club list moves up (critique M5).
            <CityChips onPicked={() => setCitiesOpen(false)} />
          ) : (
            <p class={styles.collapsed}>{cities.map((c) => c.name).join(" · ")}</p>
          )}
        </>
      )}

      {cities.length > 0 && (
        <>
          <SectionLabel right={`${chosen} of ${clubTotal}`}>Clubs</SectionLabel>
          {clubTotal > SEARCH_THRESHOLD && (
            <SearchField
              value={query}
              onInput={setQuery}
              onFocusChange={setFocused}
              label="Search clubs"
              placeholder={`Search ${cities.length === 1 ? cities[0].name : "these"} clubs`}
            />
          )}
          <ClubList query={query} />
        </>
      )}
    </div>
  );
}
