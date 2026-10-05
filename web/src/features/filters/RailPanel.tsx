import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../../components/Icon/Icon.tsx";
import type { Summary } from "../../lib/filters/summary.ts";
import styles from "./RailPanel.module.css";

interface Props {
  id: string;
  title: string;
  summary: Summary;
  defaultOpen: boolean;
  /** Bumped by the parent to force-open this panel, bring it into view and focus its `[data-autofocus]`. */
  revealNonce?: number;
  /** Header actions (Clear / Select all), decided by the rail. */
  actions?: ComponentChildren;
  children: ComponentChildren;
}

/** A collapsible filter section in the desktop rail; collapsed it shows its summary. */
export function RailPanel({ id, title, summary, defaultOpen, revealNonce, actions, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const root = useRef<HTMLElement>(null);

  // Opening happens first; focus waits a frame until the body is no longer hidden (critique r6 H3).
  useEffect(() => {
    if (!revealNonce) return;
    setOpen(true);
    requestAnimationFrame(() => {
      const panel = root.current;
      panel?.scrollIntoView({ block: "nearest", behavior: "smooth" }); // no window jump when it's already in view
      panel?.querySelector<HTMLElement>(`#${id}-body [data-autofocus]`)?.focus({ preventScroll: true });
    });
  }, [revealNonce]);

  return (
    <section ref={root} class={styles.panel} aria-labelledby={`${id}-title`}>
      <div class={styles.head}>
        <h2 class={styles.heading}>
          <button type="button" class={styles.toggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(!open)}>
            <span id={`${id}-title`} class={styles.title}>
              {title}
            </span>
            {!open && (
              <span class={styles.summary}>
                <span class={summary.empty ? styles.muted : undefined}>{summary.line1}</span>
                {summary.line2 && <span class={styles.muted}>{summary.line2}</span>}
              </span>
            )}
            <Icon name="chevron-down" size={20} class={open ? styles.chevronOpen : styles.chevron} />
          </button>
        </h2>
        {actions}
      </div>
      <div id={`${id}-body`} hidden={!open} class={styles.body}>
        {children}
      </div>
    </section>
  );
}
