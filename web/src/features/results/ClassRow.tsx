import { displayName } from "../../../../shared/families.ts";
import { Icon } from "../../components/Icon/Icon.tsx";
import { Tag } from "../../components/Tag/Tag.tsx";
import { bookingColumn, bookingStatus, bookingTag } from "../../lib/booking.ts";
import { instructorText, type ResultItem, rowFocusKey } from "../../lib/results.ts";
import { dateOf, formatClock, formatShortDate, minutesOf, zoneAbbrev } from "../../lib/time.ts";
import styles from "./ClassRow.module.css";

interface Props {
  item: ResultItem;
  multiClub: boolean;
  multiZone: boolean;
  nowMs: number;
  onOpen: (item: ResultItem) => void;
}

/**
 * One class in the agenda. The whole row opens the in-app detail; the chevron
 * invites that without implying we leave the app (owner feedback).
 */
export function ClassRow({ item, multiClub, multiZone, nowMs, onOpen }: Props) {
  const { c, club } = item;
  const start = minutesOf(c.startLocal);
  const end = minutesOf(c.endLocal);
  const status = bookingStatus(c, club.timeZone, nowMs);
  const tag = bookingTag(status, club.timeZone, nowMs);
  const who = instructorText(item);
  const name = displayName(c.name);
  const zone = multiZone ? zoneAbbrev(club.timeZone, new Date(c.startDate)) : "";

  return (
    <li>
      <button
        type="button"
        class={`${styles.row} ${c.isCancelled ? styles.cancelled : ""}`}
        // Lets the detail sheet find this row again, even if the list re-rendered while it was open.
        data-focus-key={rowFocusKey(item)}
        aria-haspopup="dialog"
        aria-label={`${name}, ${formatShortDate(dateOf(c.startLocal))}, ${formatClock(start)} to ${formatClock(end)}${zone ? ` ${zone}` : ""}, ${club.shortName}, ${who}${c.isCancelled ? ", cancelled" : ""}${tag ? `, booking ${tag.toLowerCase()}` : ""}`}
        onClick={() => onOpen(item)}
      >
        <span class={styles.time}>
          <span class={styles.start}>{formatClock(start)}</span>
          {/* "to 7:45 AM", not a mono "–7:45" that reads like a negative number (critique L7). */}
          <span class={styles.end}>to {formatClock(end)}</span>
          {zone && <span class={styles.zone}>{zone}</span>}
        </span>
        <span class={styles.main}>
          <span class={styles.name}>
            <span class={styles.nameText}>{name}</span>
            {c.isCancelled && <Tag solid>Cancelled</Tag>}
            {c.label && <Tag>{c.label}</Tag>}
            {tag && <span class={styles.mobileOnly}><Tag>{tag}</Tag></span>}
          </span>
          <span class={styles.sub}>
            {multiClub && <span class={styles.subClub}>{club.shortName} · </span>}
            {who}
          </span>
        </span>
        <span class={styles.club}>{club.shortName}</span>
        <span class={styles.booking}>{bookingColumn(status, club.timeZone)}</span>
        <Icon name="chevron-right" class={styles.chevron} />
      </button>
    </li>
  );
}
