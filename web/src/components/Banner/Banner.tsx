import type { ComponentChildren } from "preact";
import styles from "./Banner.module.css";

interface Props {
  children: ComponentChildren;
  note?: ComponentChildren;
  actions?: ComponentChildren;
}

/** Full-width black bar for page-level notices (e.g. "Showing a shared search"). */
export function Banner({ children, note, actions }: Props) {
  return (
    <div class={styles.banner} role="status" data-banner>
      <div class={styles.text}>
        <p>{children}</p>
        {note && <p class={styles.note}>{note}</p>}
      </div>
      {actions && <div class={styles.actions}>{actions}</div>}
    </div>
  );
}

/** Text-style action for use inside a Banner (inverse colors). */
export function BannerAction({ children, onClick, label }: { children: ComponentChildren; onClick: () => void; label?: string }) {
  return (
    <button type="button" class={styles.action} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
