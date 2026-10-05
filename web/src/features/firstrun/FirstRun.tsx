import { Icon } from "../../components/Icon/Icon.tsx";
import { SectionLabel } from "../../components/SectionLabel/SectionLabel.tsx";
import { formatMonthDay } from "../../lib/time.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { useCitiesBySize } from "../filters/where/useCitiesBySize.ts";
import { SEARCH_PLACEHOLDER, type WhereIntent } from "../filters/where/WherePanel.tsx";
import { primeKeyboard } from "./primeKeyboard.ts";
import styles from "./FirstRun.module.css";

interface Props {
  /** Opens the Where picker on a city, or in search. */
  onStart: (intent: Omit<WhereIntent, "nonce">) => void;
}

/**
 * No clubs yet (owner round 6): find your club by name, or browse a city's clubs. Neither picks
 * anything by itself, so nothing loads until you choose clubs. City buttons carry a chevron:
 * they're places to go, not toggles (critique r6 L3).
 */
export function FirstRun({ onStart }: Props) {
  const { catalog } = useFilters();
  const cities = useCitiesBySize();
  const clubs = catalog.index.clubs.filter((c) => c.classCount > 0).length;
  return (
    <div class={styles.hero}>
      <p class={styles.eyebrow}>
        {clubs} clubs · through {formatMonthDay(catalog.index.horizon.end)}
      </p>
      <h2 class={styles.title}>
        Equinox classes
        <br />
        that fit.
      </h2>
      <p class={styles.subtitle}>Better filtering for the Equinox schedule.</p>
      <p class={styles.lede}>Pick your clubs, the days and times you can train, and what you like. We’ll remember it for next time.</p>

      <div class={styles.start}>
        <SectionLabel>Find your club</SectionLabel>
        <button
          type="button"
          class={styles.search}
          onClick={() => {
            primeKeyboard(); // inside the tap, so the phone's keyboard comes up with the picker
            onStart({ search: true });
          }}
        >
          <Icon name="search" size={20} />
          <span>{SEARCH_PLACEHOLDER}</span>
        </button>
      </div>

      <div class={styles.start}>
        <SectionLabel>Or browse a city or region</SectionLabel>
        <ul class={styles.cities}>
          {cities.map(({ city, total }) => (
            <li key={city.slug}>
              <button type="button" class={styles.city} onClick={() => onStart({ city: city.slug })} aria-label={`Browse ${city.name}, ${total} clubs`}>
                <span>{city.name}</span>
                <span class={styles.count}>{total}</span>
                <Icon name="chevron-right" size={16} class={styles.go} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
