import { useEffect, useRef, useState } from "preact/hooks";
import { SearchField } from "../../../components/SearchField/SearchField.tsx";
import { SectionLabel } from "../../../components/SectionLabel/SectionLabel.tsx";
import { defaultCity } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { CityClubs } from "./CityClubs.tsx";
import { CitySelect } from "./CitySelect.tsx";
import { ClubSearch } from "./ClubSearch.tsx";
import { PickedClubs } from "./PickedClubs.tsx";
import styles from "./WherePanel.module.css";

/** Where the picker should start: a city, or search (from the first-run screen). A new nonce re-applies it. */
export interface WhereIntent {
  city?: string;
  search?: boolean;
  nonce: number;
}

/** One wording for search, here and on the first-run screen (critique r6 L3). */
export const SEARCH_PLACEHOLDER = "Search clubs by name or area";

/**
 * Where (docs/design/05-where-flow.md): search every club, see your picks, then browse one
 * city's clubs by area. Clubs are the only thing you pick; nothing loads until you do.
 * Whichever control the intent names carries `data-autofocus`; the sheet or rail panel focuses
 * it once it's visible (critique r6 H3).
 */
export function WherePanel({ intent }: { intent?: WhereIntent | null }) {
  const { catalog, filters } = useFilters();
  const [citySlug, setCitySlug] = useState(() => intent?.city ?? defaultCity(filters, catalog).slug);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const focusSearch = () => root.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus();

  // The rail stays mounted, so a new request from the first-run screen re-aims it.
  useEffect(() => {
    if (!intent?.city) return;
    setCitySlug(intent.city);
    setQuery("");
  }, [intent?.nonce]);

  const city = catalog.cities.get(citySlug) ?? defaultCity(filters, catalog);

  return (
    <div ref={root} class={styles.panel}>
      <SearchField value={query} onInput={setQuery} label={SEARCH_PLACEHOLDER} placeholder={SEARCH_PLACEHOLDER} autoFocus={intent?.search} />
      {query.trim() ? (
        <ClubSearch query={query} />
      ) : (
        <>
          <PickedClubs onEmptied={focusSearch} />
          <div class={styles.browse}>
            <SectionLabel as="h3" flush>
              City or region
            </SectionLabel>
            <CitySelect value={city.slug} onChange={setCitySlug} autoFocus={!!intent?.city} />
          </div>
          <CityClubs city={city} />
        </>
      )}
    </div>
  );
}
