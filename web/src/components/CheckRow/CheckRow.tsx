import type { ComponentChildren } from "preact";
import { useId } from "preact/hooks";
import { CheckBox } from "./CheckBox.tsx";
import styles from "./CheckRow.module.css";

interface Props {
  /** true, false, or "mixed" (some of a group ticked). */
  checked: boolean | "mixed";
  onChange: () => void;
  label: ComponentChildren;
  sublabel?: ComponentChildren;
  meta?: ComponentChildren;
  dimmed?: boolean;
}

/** A list row with a native checkbox drawn as a square (a dash when mixed). */
export function CheckRow({ checked, onChange, label, sublabel, meta, dimmed }: Props) {
  const id = useId();
  return (
    <label class={`${styles.row} ${dimmed ? styles.dimmed : ""}`}>
      <CheckBox checked={checked} onChange={onChange} labelledBy={`${id}-label`} describedBy={sublabel || meta ? `${id}-desc` : undefined} />
      <span class={styles.text}>
        <span id={`${id}-label`} class={styles.label}>
          {label}
        </span>
        {sublabel && <span class={styles.sublabel}>{sublabel}</span>}
      </span>
      {meta && <span class={styles.meta}>{meta}</span>}
      {(sublabel || meta) && (
        <span id={`${id}-desc`} class="visually-hidden">
          {[sublabel, meta].filter(Boolean).join(", ")}
        </span>
      )}
    </label>
  );
}
