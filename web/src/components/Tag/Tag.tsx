import type { ComponentChildren } from "preact";
import styles from "./Tag.module.css";

interface Props {
  children: ComponentChildren;
  solid?: boolean;
}

/** Small mono label: NEW, UPDATED, OPEN, OPENS 5 AM, CANCELLED (solid). */
export function Tag({ children, solid }: Props) {
  return <span class={`${styles.tag} ${solid ? styles.solid : ""}`}>{children}</span>;
}
