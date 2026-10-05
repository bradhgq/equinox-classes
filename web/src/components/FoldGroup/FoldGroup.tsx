import type { ComponentChildren } from "preact";
import { useId, useState } from "preact/hooks";
import { CheckBox } from "../CheckRow/CheckBox.tsx";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./FoldGroup.module.css";

interface Props {
  title: string;
  /** Right-hand count, e.g. "13 of 13" or "4/wk". */
  meta?: string;
  /** Derived "All" state of the group. */
  state: "off" | "on" | "mixed";
  onToggleAll: () => void;
  /** Accessible name of the All checkbox, e.g. "All Downtown clubs". */
  allLabel: string;
  defaultOpen?: boolean;
  children: ComponentChildren;
}

/**
 * A foldable group in a checkbox list (owner round 3). The header's checkbox is
 * "All": ticked when every item is, a dash when some are; it ticks or unticks
 * them all. The rest of the header folds the group open or closed.
 */
export function FoldGroup({ title, meta, state, onToggleAll, allLabel, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section class={styles.group}>
      <div class={styles.header}>
        <label class={styles.check}>
          <CheckBox checked={state === "on" ? true : state === "mixed" ? "mixed" : false} onChange={onToggleAll} label={allLabel} />
        </label>
        <button type="button" class={styles.fold} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <span class={styles.title}>{title}</span>
          {meta && <span class={styles.meta}>{meta}</span>}
          <Icon name="chevron-down" class={`${styles.chevron} ${open ? styles.open : ""}`} />
        </button>
      </div>
      <div id={bodyId} class={styles.body} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
