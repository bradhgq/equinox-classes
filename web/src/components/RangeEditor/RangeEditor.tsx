import { endOptions, startOptions, type TimeRange, withEnd, withStart } from "../../lib/ranges.ts";
import { formatClock } from "../../lib/time.ts";
import { Icon } from "../Icon/Icon.tsx";
import { TimeSelect } from "../TimeSelect/TimeSelect.tsx";
import styles from "./RangeEditor.module.css";

const STARTS = startOptions();
const ENDS = endOptions();

interface Props {
  range: TimeRange;
  dayName: string; // "Monday", for accessible labels
  index: number;
  onChange: (range: TimeRange) => void;
  onRemove: () => void;
}

/** [start ▾] – [end ▾] [✕] for one time range. */
export function RangeEditor({ range, dayName, index, onChange, onRemove }: Props) {
  const n = index + 1;
  return (
    <div class={styles.range}>
      <TimeSelect
        value={range.start}
        options={STARTS}
        label={`${dayName}, range ${n}, start`}
        onChange={(start) => onChange(withStart(range, start))}
      />
      <span class={styles.dash} aria-hidden="true">
        –
      </span>
      <TimeSelect
        value={range.end}
        options={ENDS}
        disabledThrough={range.start}
        label={`${dayName}, range ${n}, end`}
        onChange={(end) => onChange(withEnd(range, end))}
      />
      <button
        type="button"
        class={styles.remove}
        aria-label={`Remove ${dayName} ${formatClock(range.start)} to ${formatClock(range.end)}`}
        onClick={onRemove}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
