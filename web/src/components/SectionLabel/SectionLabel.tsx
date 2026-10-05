import type { ComponentChildren } from "preact";
import styles from "./SectionLabel.module.css";

interface Props {
  children: ComponentChildren;
  right?: ComponentChildren;
  /** Render as a heading for structure (e.g. inside a sheet). */
  as?: "h3" | "h4" | "div";
  id?: string;
}

/** Mono eyebrow label above a block of controls. */
export function SectionLabel({ children, right, as: Tag = "div", id }: Props) {
  return (
    <div class={styles.wrap}>
      <Tag class={styles.label} id={id}>
        {children}
      </Tag>
      {right && <div class={styles.right}>{right}</div>}
    </div>
  );
}
