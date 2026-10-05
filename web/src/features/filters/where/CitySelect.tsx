import type { City } from "../../../../../shared/schema.ts";
import { Icon } from "../../../components/Icon/Icon.tsx";
import { tickedIn } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { useCitiesBySize } from "./useCitiesBySize.ts";
import styles from "./CitySelect.module.css";

interface Props {
  value: string;
  onChange: (citySlug: string) => void;
  /** Take focus when the picker opens on a city (first-run city buttons, critique r6 H3). */
  autoFocus?: boolean;
}

/**
 * Which city or region's clubs are listed, most clubs first. It's for browsing: switching never
 * changes your picks, so it's a plain select rather than anything that looks like a choice.
 */
export function CitySelect({ value, onChange, autoFocus }: Props) {
  const { filters } = useFilters();
  const cities = useCitiesBySize();
  const label = ({ city, total }: { city: City; total: number }) => {
    const picked = tickedIn(filters, city.clubIds).length;
    return `${city.name} · ${picked ? `${picked} of ${total} picked` : `${total} ${total === 1 ? "club" : "clubs"}`}`;
  };
  return (
    <div class={styles.wrap}>
      <select
        class={styles.select}
        aria-label="City or region"
        value={value}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      >
        {cities.map((c) => (
          <option key={c.city.slug} value={c.city.slug}>
            {label(c)}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={20} class={styles.chevron} />
    </div>
  );
}
