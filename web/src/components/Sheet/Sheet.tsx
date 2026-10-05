import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";
import { Icon } from "../Icon/Icon.tsx";
import styles from "./Sheet.module.css";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  /** How it presents from 1024 px up: centered dialog, or a right-hand drawer. */
  desktop?: "dialog" | "drawer";
  /** Phones: size to the content instead of filling the screen (the class detail). */
  fit?: boolean;
  /** Hide the footer, e.g. while the on-screen keyboard is up (critique H4). */
  hideFooter?: boolean;
  /** A line above the title (the class detail's date and time). */
  eyebrow?: string;
  /** A toast shown inside the dialog, so its action stays in the focus trap (critique M1). */
  toast?: ComponentChildren;
  /** data-focus-key of the element to refocus on close when the opener never took focus
   *  (Safari doesn't focus tapped buttons), e.g. the class row behind the detail. */
  returnFocusKey?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Put focus back where the sheet was opened from, even if that element re-rendered (critique C1). */
function restoreFocus(opener: HTMLElement | null, key: string | undefined) {
  const usable = opener && opener !== document.body && opener.isConnected;
  const target = usable ? opener : key ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`) : null;
  target?.focus({ preventScroll: true });
}

/**
 * Modal sheet: a bottom sheet on phones, a centered dialog on tablets, and a
 * dialog or right drawer on desktop. Traps focus, closes on Esc or scrim tap,
 * and returns focus to whatever opened it.
 */
export function Sheet({ open, title, onClose, children, footer, desktop = "dialog", fit, hideFooter, eyebrow, toast, returnFocusKey }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const openerKey = opener?.dataset?.focusKey ?? returnFocusKey;
    document.body.setAttribute("data-scroll-locked", "");
    // Focus the dialog itself: screen readers announce its title, and no focus ring
    // lands on a control the user didn't pick. Tab then moves into the sheet.
    const preferred = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? panel.current)?.focus({ preventScroll: true });
    // Esc on the document, so it still works if focus has fallen to <body> (critique M2).
    // Popovers handle their own Esc in the capture phase and stop it before it gets here.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.removeAttribute("data-scroll-locked");
      restoreFocus(opener, openerKey);
    };
  }, [open]);

  if (!open) return null;

  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div class={styles.layer} data-desktop={desktop} data-fit={fit ? "" : undefined}>
      <div class={styles.scrim} onClick={onClose} />
      <div ref={panel} class={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={trapTab}>
        <header class={styles.header}>
          <div class={styles.titles}>
            {eyebrow && <p class={styles.eyebrow}>{eyebrow}</p>}
            <h2 id={titleId} class={styles.title}>
              {title}
            </h2>
          </div>
          <button type="button" class={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </header>
        <div class={styles.body}>{children}</div>
        {toast && <div class={`${styles.toastSlot} ${footer && !hideFooter ? styles.aboveFooter : ""}`}>{toast}</div>}
        {footer && !hideFooter && <footer class={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
