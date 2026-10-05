import { useEffect, useState } from "preact/hooks";
import { formatShortDate } from "../../lib/time.ts";
import styles from "./MetaLine.module.css";

const STALE_MS = 24 * 3600_000; // ~2x the 12 h poll interval (critique L4)

interface Props {
  count: number;
  loading: { loaded: number; failed: number; total: number };
  generatedAt: string;
  nowMs: number;
}

const classes = (n: number) => `${n.toLocaleString()} ${n === 1 ? "class" : "classes"}`;

/**
 * The result count. Freshness lives in the footer (owner round 3); only a stale
 * schedule is worth flagging up here. Screen readers hear the settled count once,
 * not every loading step (critique L9).
 */
export function MetaLine({ count, loading, generatedAt, nowMs }: Props) {
  const settled = loading.loaded + loading.failed >= loading.total;
  const stale = nowMs - Date.parse(generatedAt) > STALE_MS;
  const text = settled
    ? `${classes(count)}${loading.failed ? ` · ${loading.failed} ${loading.failed === 1 ? "club" : "clubs"} didn’t load` : ""}`
    : `Loading ${loading.loaded} of ${loading.total} clubs…`;

  // Announce after things settle down for half a second.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    if (!settled) return;
    const t = setTimeout(() => setAnnounced(classes(count)), 500);
    return () => clearTimeout(t);
  }, [settled, count]);

  return (
    <div class={styles.meta}>
      <p class={styles.count}>{text}</p>
      <p class="visually-hidden" aria-live="polite">
        {announced}
      </p>
      {stale && <p class={styles.stale}>May be out of date · updated {formatShortDate(generatedAt.slice(0, 10))}</p>}
    </div>
  );
}
