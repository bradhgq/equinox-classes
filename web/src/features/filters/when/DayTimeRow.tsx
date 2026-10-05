import { Icon } from "../../../components/Icon/Icon.tsx";
import { RangeEditor } from "../../../components/RangeEditor/RangeEditor.tsx";
import { nextRange, type PresetName, PRESETS, type TimeRange } from "../../../lib/ranges.ts";
import { DAY_LONG, DAY_SHORT } from "../../../lib/time.ts";
import styles from "./DayTimeRow.module.css";

interface Props {
  day: number;
  ranges: readonly TimeRange[];
  onChange: (index: number, range: TimeRange) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onPreset: (preset: PresetName) => void;
  /** Remove the whole day (same as switching it off in the strip). */
  onRemoveDay: () => void;
}

/**
 * One selected day: an ✕ chip to drop the day, its time ranges (or "Any time"
 * with one-line Morning / Lunch / Evening presets), and "+".
 */
export function DayTimeRow({ day, ranges, onChange, onRemove, onAdd, onPreset, onRemoveDay }: Props) {
  const canAdd = nextRange(ranges) !== null;
  return (
    <div class={styles.row}>
      <button type="button" class={styles.day} aria-label={`Remove ${DAY_LONG[day]}`} onClick={onRemoveDay}>
        <span>{DAY_SHORT[day]}</span>
        <Icon name="close" size={16} />
      </button>
      <div class={styles.ranges} role="group" aria-label={`${DAY_LONG[day]} times`}>
        {ranges.length === 0 ? (
          <div class={styles.empty}>
            <span class={styles.any}>Any time</span>
            <span class={styles.presets}>
              {(Object.keys(PRESETS) as PresetName[]).map((p) => (
                <button key={p} type="button" class={styles.preset} onClick={() => onPreset(p)}>
                  {PRESETS[p].label}
                </button>
              ))}
            </span>
          </div>
        ) : (
          ranges.map((r, i) => (
            <RangeEditor
              key={i}
              range={r}
              index={i}
              dayName={DAY_LONG[day]}
              onChange={(next) => onChange(i, next)}
              onRemove={() => onRemove(i)}
            />
          ))
        )}
      </div>
      <button type="button" class={styles.add} disabled={!canAdd} aria-label={`Add a time range for ${DAY_LONG[day]}`} onClick={onAdd}>
        <Icon name="plus" />
      </button>
    </div>
  );
}
