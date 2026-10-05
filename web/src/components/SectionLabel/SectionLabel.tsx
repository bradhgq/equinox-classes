import type { ComponentChildren } from "preact";
import styles from "./SectionLabel.module.css";

interface Props {
  children: ComponentChildren;
  right?: ComponentChildren;
  /** Render as a heading for structure (e.g. inside a sheet). */
  as?: "h3" | "h4" | "div";
  id?: string;
  /** No top margin, for stacks that space their own children (the Where picker). */
  flush?: boolean;
}

/** Mono eyebrow label above a block of controls. */
export function SectionLabel({ children, right, as: Tag = "div", id, flush }: Props) {
  return (
    <div class={`${styles.wrap} ${flush ? styles.flush : ""}`}>
      <Tag class={styles.label} id={id}>
        {children}
      </Tag>
      {right && <div class={styles.right}>{right}</div>}
    </div>
  );
}
