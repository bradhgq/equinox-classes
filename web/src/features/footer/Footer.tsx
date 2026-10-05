import { BOOKING_RULES_URL } from "../../../../shared/links.ts";
import { formatAgo } from "../../lib/time.ts";
import styles from "./Footer.module.css";

/**
 * Freshness first, then the how-it-works notes as small footnotes (owner round 3:
 * keep behavior notices out of the way, at the very bottom).
 */
export function Footer({ generatedAt, nowMs }: { generatedAt: string; nowMs: number }) {
  return (
    <footer class={styles.footer}>
      <p class={styles.updated}>Updated {formatAgo(generatedAt, new Date(nowMs))} from equinox.com</p>
      <ol class={styles.notes}>
        <li>Times filter by when a class starts. New days start with the times you set most recently; a day with no times means any time.</li>
        <li>
          Booking opens 26 hours before class (
          <a href={BOOKING_RULES_URL} target="_blank" rel="noopener noreferrer">
            Equinox’s rule
          </a>
          ). Reminders are calendar events at that moment.
        </li>
        <li>Unofficial; not affiliated with Equinox. One cookie remembers your filters on this device. No tracking.</li>
      </ol>
    </footer>
  );
}
