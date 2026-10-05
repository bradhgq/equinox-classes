import type { ComponentChildren } from "preact";
import styles from "./EmptyState.module.css";

interface Props {
  title: string;
  text?: ComponentChildren;
  /** Buttons stacked full-width under the text. */
  actions?: ComponentChildren;
  footnote?: ComponentChildren;
  alert?: boolean;
}

/** Big uppercase headline + sentence + actions: no matches, load errors. */
export function EmptyState({ title, text, actions, footnote, alert }: Props) {
  return (
    <div class={styles.empty} role={alert ? "alert" : undefined}>
      <h2 class={styles.title}>{title}</h2>
      {text && <p class={styles.text}>{text}</p>}
      {actions && <div class={styles.fixes}>{actions}</div>}
      {footnote && <p class={styles.hint}>{footnote}</p>}
    </div>
  );
}
