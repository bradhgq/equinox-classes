import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import styles from "./Toast.module.css";

export interface ToastMessage {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  /** Show it just under this element (e.g. "Link copied" under Share); else bottom-center. */
  anchor?: HTMLElement | null;
  durationMs?: number;
}

interface Props {
  toast: ToastMessage | null;
  onDismiss: () => void;
  /** Rendered inside an open sheet's toast slot (no fixed positioning of its own). */
  inline?: boolean;
}

/** Auto-dismiss timer that pauses while the toast is hovered or focused. */
function useDismissTimer(toast: ToastMessage | null, onDismiss: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadline = useRef(0);
  const remaining = useRef(0);
  const start = (ms: number) => {
    clearTimeout(timer.current);
    deadline.current = Date.now() + ms;
    timer.current = setTimeout(onDismiss, ms);
  };
  useEffect(() => {
    if (!toast) return;
    start(toast.durationMs ?? 2500);
    return () => clearTimeout(timer.current);
  }, [toast]);
  return {
    pause: () => {
      clearTimeout(timer.current);
      remaining.current = Math.max(1000, deadline.current - Date.now());
    },
    resume: () => start(remaining.current || 2500),
  };
}

export function Toast({ toast, onDismiss, inline }: Props) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const { pause, resume } = useDismissTimer(toast, onDismiss);

  useLayoutEffect(() => {
    if (inline || !toast?.anchor) return setPos(null);
    const r = toast.anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) });
  }, [toast, inline]);

  const placement = inline ? styles.inline : pos ? styles.anchored : styles.bottom;
  return (
    <div class={inline ? styles.inlineRegion : styles.region} role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          class={`${styles.toast} ${placement}`}
          style={pos && !inline ? { top: `${pos.top}px`, right: `${pos.right}px` } : undefined}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocusIn={pause}
          onFocusOut={resume}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              class={styles.action}
              onClick={() => {
                toast.action!.run();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
