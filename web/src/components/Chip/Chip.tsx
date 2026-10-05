import type { ComponentChildren } from "preact";
import styles from "./Chip.module.css";

export type ChipState = "off" | "on" | "mixed";

interface Props {
  state: ChipState;
  onToggle: (e: MouseEvent) => void;
  /** Shown as " · N" in the mixed (narrowed) state. */
  count?: number;
  /** Extra context for assistive tech, e.g. "2 of 6 areas". */
  description?: string;
  children: ComponentChildren;
}

/**
 * Toggle chip with three states (critique H3): off, on (all of it) and
 * mixed (narrowed: outlined, with a count).
 */
export function Chip({ state, onToggle, count, description, children }: Props) {
  return (
    <button
      type="button"
      class={`${styles.chip} ${styles[state]}`}
      aria-pressed={state === "mixed" ? "mixed" : state === "on"}
      onClick={onToggle}
    >
      {children}
      {state === "mixed" && count !== undefined && (
        <span class={styles.count} aria-hidden="true">
          {" "}
          · {count}
        </span>
      )}
      {description && <span class="visually-hidden">, {description}</span>}
    </button>
  );
}

export function ChipGroup({ children, label }: { children: ComponentChildren; label: string }) {
  return (
    <div class={styles.group} role="group" aria-label={label}>
      {children}
    </div>
  );
}
