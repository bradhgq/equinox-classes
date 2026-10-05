import { SectionLabel } from "../../components/SectionLabel/SectionLabel.tsx";
import { formatMonthDay } from "../../lib/time.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { CityChips } from "../filters/where/CityChips.tsx";
import styles from "./FirstRun.module.css";

/**
 * No clubs chosen yet: never dump all of Equinox. City chips (most clubs first)
 * lead straight to results; cities with areas open the area popover.
 */
export function FirstRun() {
  const { catalog } = useFilters();
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
      <SectionLabel>Start with a city</SectionLabel>
      <CityChips />
    </div>
  );
}
