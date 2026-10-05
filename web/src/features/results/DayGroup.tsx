import type { DayBucket, ResultItem } from "../../lib/results.ts";
import { formatDayHeading, formatShortDate } from "../../lib/time.ts";
import { ClassRow } from "./ClassRow.tsx";
import styles from "./DayGroup.module.css";

interface Props {
  day: DayBucket;
  multiClub: boolean;
  multiZone: boolean;
  nowMs: number;
  onOpen: (item: ResultItem) => void;
}

/** One day of the agenda: sticky heading, horizon notes, then its classes. */
export function DayGroup({ day, multiClub, multiZone, nowMs, onOpen }: Props) {
  const count = day.items.filter((i) => !i.c.isCancelled).length;
  return (
    <section class={styles.day} aria-labelledby={`day-${day.date}`}>
      <h3 id={`day-${day.date}`} class={styles.heading}>
        <span>{formatDayHeading(day.date)}</span>
        <span class={styles.count}>
          {count}
          <span class="visually-hidden"> {count === 1 ? "class" : "classes"}</span>
        </span>
      </h3>
      {/* A club whose published schedule ended before this day (critique M8: say so, don't go quiet). */}
      {day.horizonEnds.map((club) => (
        <p key={club.id} class={styles.horizon}>
          {club.shortName} · schedule published through {club.lastDate ? formatShortDate(club.lastDate) : "earlier"}
        </p>
      ))}
      <ul>
        {day.items.map((item) => (
          <ClassRow
            key={`${item.club.id}-${item.c.classInstanceId}`}
            item={item}
            multiClub={multiClub}
            multiZone={multiZone}
            nowMs={nowMs}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}
