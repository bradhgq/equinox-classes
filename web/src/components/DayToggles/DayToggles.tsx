import { useRef, useState } from "preact/hooks";
import { DAY_LETTERS, DAY_LONG } from "../../lib/time.ts";
import styles from "./DayToggles.module.css";

interface Props {
  value: readonly number[];
  onToggle: (day: number) => void;
}

/** S M T W T F S toggles, Sunday first. One tab stop; arrow keys move between days (roving tabindex). */
export function DayToggles({ value, onToggle }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(() => value[0] ?? 1);

  const onKeyDown = (e: KeyboardEvent, day: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (day + step + 7) % 7;
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div class={styles.strip} role="group" aria-label="Days of the week">
      {DAY_LETTERS.map((letter, day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            ref={(el) => {
              refs.current[day] = el;
            }}
            type="button"
            class={`${styles.day} ${on ? styles.on : ""}`}
            aria-pressed={on}
            aria-label={DAY_LONG[day]}
            tabIndex={day === active ? 0 : -1}
            onFocus={() => setActive(day)}
            onClick={() => onToggle(day)}
            onKeyDown={(e) => onKeyDown(e, day)}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
