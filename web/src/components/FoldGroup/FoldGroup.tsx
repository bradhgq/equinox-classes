import type { ComponentChildren } from "preact";
import { useId, useState } from "preact/hooks";
import { CheckBox } from "../CheckRow/CheckBox.tsx";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./FoldGroup.module.css";

interface Props {
  title: string;
  /** Right-hand count, e.g. "13 of 13" or "4/wk". */
  meta?: string;
  /**
   * The header's "All" checkbox (What): ticked when every item is, a dash when some are.
   * Without it (Where) the header only folds, and any bulk action lives inside the group.
   */
  all?: { state: "off" | "on" | "mixed"; onToggle: () => void; label: string };
  defaultOpen?: boolean;
  children: ComponentChildren;
}

/**
 * A foldable group in a list (owner round 3). The title row is a heading and folds the group
 * open or closed; it never wraps, and its chevron sits at the right edge (critique r6 H2, L1).
 */
export function FoldGroup({ title, meta, all, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section class={styles.group}>
      <div class={styles.header}>
        {all && (
          <label class={styles.check}>
            <CheckBox checked={all.state === "on" ? true : all.state === "mixed" ? "mixed" : false} onChange={all.onToggle} label={all.label} />
          </label>
        )}
        <h3 class={styles.heading}>
          <button type="button" class={styles.fold} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
            <span class={styles.title}>{title}</span>
            {meta && <span class={styles.meta}>{meta}</span>}
            <Icon name="chevron-down" class={`${styles.chevron} ${open ? styles.open : ""}`} />
          </button>
        </h3>
      </div>
      <div id={bodyId} class={`${styles.body} ${all ? "" : styles.flush}`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
