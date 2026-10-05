import { Button } from "../../../components/Button/Button.tsx";
import { DayToggles } from "../../../components/DayToggles/DayToggles.tsx";
import { SectionLabel } from "../../../components/SectionLabel/SectionLabel.tsx";
import {
  addRange,
  applyPreset,
  applyToAll,
  lastTouchedDay,
  rangesDiffer,
  removeRange,
  setDays,
  toggleDay,
  updateRange,
} from "../../../lib/filters/when.ts";
import { DAY_SHORT } from "../../../lib/time.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { DayTimeRow } from "./DayTimeRow.tsx";
import styles from "./WhenPanel.module.css";

const SHORTCUTS = [
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
  { label: "All", days: [0, 1, 2, 3, 4, 5, 6] },
];

/**
 * When: S M T W T F S, then one row of time ranges per selected day
 * (handoff §5.4). New days copy the most recently touched day's times.
 * How times work is explained once, in the page footnotes.
 */
export function WhenPanel() {
  const { filters, memory, updateWhen } = useFilters();
  const source = lastTouchedDay(filters, memory);

  return (
    <div>
      <SectionLabel
        right={SHORTCUTS.map((s) => (
          <Button
            key={s.label}
            variant="text"
            size="sm"
            onClick={() => updateWhen((f, m) => setDays(f, m, s.days), filters.days.length ? { undoLabel: `Set ${s.label.toLowerCase()}` } : undefined)}
          >
            {s.label}
          </Button>
        ))}
      >
        Days
      </SectionLabel>
      <DayToggles value={filters.days} onToggle={(day) => updateWhen((f, m) => toggleDay(f, m, day))} />

      {filters.days.length > 0 && (
        <>
          <SectionLabel>Times</SectionLabel>
          <div class={styles.rows}>
            {filters.days.map((day) => (
              <DayTimeRow
                key={day}
                day={day}
                ranges={filters.ranges[day] ?? []}
                onChange={(i, r) => updateWhen((f, m) => updateRange(f, m, day, i, r))}
                onRemove={(i) => updateWhen((f, m) => removeRange(f, m, day, i))}
                onAdd={() => updateWhen((f, m) => addRange(f, m, day))}
                onPreset={(p) => updateWhen((f, m) => applyPreset(f, m, day, p))}
                onRemoveDay={() => updateWhen((f, m) => toggleDay(f, m, day), { undoLabel: `Removed ${DAY_SHORT[day]}` })}
              />
            ))}
          </div>
          {rangesDiffer(filters) && source !== null && (
            <Button
              class={styles.apply}
              variant="text"
              size="sm"
              onClick={() => updateWhen((f, m) => applyToAll(f, m, source), { undoLabel: `Applied ${DAY_SHORT[source]}` })}
            >
              Copy {DAY_SHORT[source]}’s times to all days
            </Button>
          )}
        </>
      )}
    </div>
  );
}
