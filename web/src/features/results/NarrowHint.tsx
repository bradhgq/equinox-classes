import { useState } from "preact/hooks";
import { Button } from "../../components/Button/Button.tsx";
import type { FilterName } from "../filters/useSummaries.ts";
import styles from "./NarrowHint.module.css";

const KEY = "eqxc_hint_dismissed";

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** After picking clubs with no other filters, point at When and What (critique L1). */
export function NarrowHint({ onReveal }: { onReveal: (filter: FilterName) => void }) {
  const [dismissed, setDismissed] = useState(wasDismissed);
  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };
  return (
    <div class={styles.hint}>
      <p class={styles.text}>Narrow it down</p>
      <div class={styles.actions}>
        <Button size="sm" onClick={() => onReveal("when")}>
          Days &amp; times
        </Button>
        <Button size="sm" onClick={() => onReveal("what")}>
          Class types
        </Button>
        <Button variant="icon" size="sm" icon="close" label="Dismiss" onClick={dismiss} />
      </div>
    </div>
  );
}
