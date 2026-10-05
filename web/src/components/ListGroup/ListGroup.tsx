import type { ComponentChildren } from "preact";
import styles from "./ListGroup.module.css";

interface Props {
  title: string;
  right?: ComponentChildren;
  children: ComponentChildren;
}

/** A titled group inside a checkbox list ("DOWNTOWN · 13", "YOGA · 14/WK"). */
export function ListGroup({ title, right, children }: Props) {
  return (
    <section class={styles.group}>
      <h3 class={styles.heading}>
        <span>{title}</span>
        {right && <span class={styles.right}>{right}</span>}
      </h3>
      <div>{children}</div>
    </section>
  );
}
