import { useEffect, useRef } from "preact/hooks";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./CheckRow.module.css";

interface Props {
  checked: boolean | "mixed";
  onChange: () => void;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
}

/**
 * The square checkbox on its own (used by CheckRow and FoldGroup headers).
 * A real <input type=checkbox>, so "mixed" is announced via `indeterminate`.
 */
export function CheckBox({ checked, onChange, labelledBy, describedBy, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.indeterminate = checked === "mixed";
  }, [checked]);
  return (
    <>
      <input
        ref={input}
        class={styles.input}
        type="checkbox"
        checked={checked === true}
        onChange={onChange}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={label}
      />
      <span class={`${styles.box} ${checked ? styles.boxOn : ""}`} aria-hidden="true">
        {checked === true && <Icon name="check" size={16} />}
        {checked === "mixed" && <span class={styles.dash} />}
      </span>
    </>
  );
}
