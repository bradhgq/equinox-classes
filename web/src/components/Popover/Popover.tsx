import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import styles from "./Popover.module.css";

interface Props {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  label: string;
  children: ComponentChildren;
  footer?: ComponentChildren;
}

const GAP = 10;
const MARGIN = 16;

/** The element that scrolls `el` (a sheet body, the rail, or the page). */
function scrollParent(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === "auto" || overflowY === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement as HTMLElement;
}

/** If the popover won't fit under its anchor, scroll the anchor up so it does. */
function makeRoomBelow(anchor: HTMLElement, height: number) {
  const deficit = anchor.getBoundingClientRect().bottom + GAP + height - (window.innerHeight - MARGIN);
  if (deficit > 0) scrollParent(anchor).scrollBy({ top: deficit });
}

/**
 * A small dialog anchored to the element that opened it (the city chip for
 * AreaPopover). Esc or a tap outside closes it without applying anything.
 */
export function Popover({ anchor, open, onClose, label, children, footer }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: 0, caret: 0, above: false });

  useLayoutEffect(() => {
    if (!open || !anchor || !box.current) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const b = box.current!.getBoundingClientRect();
      const width = b.width;
      const left = Math.min(Math.max(a.left + a.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN);
      const fitsBelow = a.bottom + GAP + b.height <= window.innerHeight - MARGIN;
      const above = !fitsBelow && a.top - GAP - b.height >= MARGIN;
      const top = above ? a.top - GAP - b.height : Math.min(a.bottom + GAP, window.innerHeight - b.height - MARGIN);
      setPos({ top: Math.max(MARGIN, top), left, caret: a.left + a.width / 2 - left, above });
    };
    makeRoomBelow(anchor, box.current.getBoundingClientRect().height);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      anchor?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  // Keep Tab inside the popover while it's open (critique L9).
  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>("input, button:not([disabled]), a[href]")];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div class={styles.scrim} onClick={onClose} />
      <div
        ref={box}
        class={styles.popover}
        role="dialog"
        aria-label={label}
        onKeyDown={trapTab}
        style={{ top: `${pos.top}px`, left: `${pos.left}px`, "--caret": `${pos.caret}px` }}
        data-above={pos.above ? "" : undefined}
      >
        <div class={styles.body}>{children}</div>
        {footer && <div class={styles.footer}>{footer}</div>}
      </div>
    </>
  );
}
