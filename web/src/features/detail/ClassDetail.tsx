import type { ComponentChildren } from "preact";
import { displayName } from "../../../../shared/families.ts";
import { ClampedText } from "../../components/ClampedText/ClampedText.tsx";
import { Icon } from "../../components/Icon/Icon.tsx";
import { Sheet } from "../../components/Sheet/Sheet.tsx";
import { bookingSentence, bookingStatus } from "../../lib/booking.ts";
import { categoryOfClass } from "../../lib/filters/match.ts";
import { instructorText, type ResultItem, rowFocusKey } from "../../lib/results.ts";
import { dateOf, formatInZone, formatRange, formatShortDate, minutesOf, zoneAbbrev } from "../../lib/time.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { BookingActions } from "./BookingActions.tsx";
import styles from "./ClassDetail.module.css";

interface Props {
  item: ResultItem | null;
  description: string | undefined;
  nowMs: number;
  onClose: () => void;
  toast?: ComponentChildren;
}

/**
 * Class detail inside the app (owner: rows open this, they don't leave).
 * Only "Book on Equinox ↗" leaves, because it really does.
 */
export function ClassDetail({ item, description, nowMs, onClose, toast }: Props) {
  const { catalog } = useFilters();
  if (!item) return null;

  const { c, club } = item;
  const name = displayName(c.name);
  const status = bookingStatus(c, club.timeZone, nowMs);
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const otherZone = deviceZone !== club.timeZone;
  const zoneNote = otherZone ? ` ${zoneAbbrev(club.timeZone, new Date(c.startDate))}` : "";
  const eyebrow = `${formatShortDate(dateOf(c.startLocal))} · ${formatRange(minutesOf(c.startLocal), minutesOf(c.endLocal))}${zoneNote}`;
  const opensLocal = status.state === "opens" && otherZone ? formatInZone(status.opensAt, deviceZone) : null;
  const category = catalog.categories.get(categoryOfClass(catalog, c))?.name;

  const facts: [string, string | null][] = [
    ["Club", club.name],
    ["Instructor", instructorText(item)],
    ["Studio", c.studioName],
    ["Level", c.classLevel],
    ["Category", category ?? null],
  ];

  return (
    <Sheet open fit title={name} eyebrow={eyebrow} onClose={onClose} desktop="drawer" toast={toast} returnFocusKey={rowFocusKey(item)}>
      <dl class={styles.facts}>
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} class={styles.fact}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      {description && (
        <div class={styles.description}>
          <ClampedText text={description} />
        </div>
      )}

      <p class={styles.booking}>
        <Icon name="calendar" size={20} />
        <span>
          {c.isCancelled ? "This class was cancelled" : bookingSentence(status, club.timeZone)}
          {!c.isCancelled && opensLocal && ` (${opensLocal.time} your time)`}
        </span>
      </p>

      <BookingActions item={item} status={status} />
    </Sheet>
  );
}
