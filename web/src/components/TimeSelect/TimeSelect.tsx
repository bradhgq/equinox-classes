import { formatClock } from "../../lib/time.ts";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./TimeSelect.module.css";

interface Props {
  value: number;
  options: readonly number[];
  /** Options at or before this minute are disabled (end selects). */
  disabledThrough?: number;
  onChange: (minutes: number) => void;
  label: string;
}

/** Native <select> of times: the phone's own wheel picker, styled to match. */
export function TimeSelect({ value, options, disabledThrough, onChange, label }: Props) {
  return (
    <div class={styles.wrap}>
      <select
        class={styles.select}
        aria-label={label}
        value={String(value)}
        onChange={(e) => onChange(Number((e.target as HTMLSelectElement).value))}
      >
        {options.map((m) => (
          <option key={m} value={String(m)} disabled={disabledThrough !== undefined && m <= disabledThrough}>
            {formatClock(m)}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={16} class={styles.chevron} />
    </div>
  );
}
