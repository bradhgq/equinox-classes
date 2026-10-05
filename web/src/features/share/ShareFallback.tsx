import { useRef } from "preact/hooks";
import { Button } from "../../components/Button/Button.tsx";
import { Sheet } from "../../components/Sheet/Sheet.tsx";
import styles from "./ShareFallback.module.css";

/** When neither the share sheet nor the clipboard works: show the link to copy by hand (handoff §5.1). */
export function ShareFallback({ url, onClose }: { url: string | null; onClose: () => void }) {
  const field = useRef<HTMLInputElement>(null);
  if (!url) return null;
  return (
    <Sheet open fit title="Share this search" onClose={onClose}>
      <p class={styles.text}>Copy this link:</p>
      <input ref={field} class={styles.field} readOnly value={url} data-autofocus onFocus={(e) => (e.target as HTMLInputElement).select()} />
      <Button variant="primary" class={styles.done} onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
