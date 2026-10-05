import { useEffect, useRef, useState } from "preact/hooks";
import type { DayBucket, ResultItem } from "../../lib/results.ts";
import { addDays, formatDateSpan, todayLocal, weekStartOf } from "../../lib/time.ts";
import { DayGroup } from "./DayGroup.tsx";
import styles from "./Agenda.module.css";

const FIRST_DAYS = 4;
const MORE_DAYS = 4;

interface Props {
  days: DayBucket[];
  /** Changes only when the filters do: the chunked list restarts at the top then, and only then. */
  resetKey: string;
  multiClub: boolean;
  multiZone: boolean;
  nowMs: number;
  onOpen: (item: ResultItem) => void;
}

function weekLabel(weekStart: string, today: string): string {
  const thisWeek = weekStartOf(today);
  if (weekStart === thisWeek) return "This week";
  if (weekStart === addDays(thisWeek, 7)) return "Next week";
  return formatDateSpan(weekStart, addDays(weekStart, 6));
}

/**
 * The day-by-day list with week dividers. Days render in chunks as you scroll,
 * so a whole-city search (5,000+ rows) stays fast (critique L4).
 */
export function Agenda({ days, resetKey, multiClub, multiZone, nowMs, onOpen }: Props) {
  const [limit, setLimit] = useState(FIRST_DAYS);
  const sentinel = useRef<HTMLDivElement>(null);

  // Not keyed on `days`: that array is rebuilt by the minute clock, toasts and sheets,
  // and resetting then would yank the list back up a week (critique C1).
  useEffect(() => setLimit(FIRST_DAYS), [resetKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setLimit((n) => n + MORE_DAYS), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [resetKey, limit, days.length]);

  const today = todayLocal(new Date(nowMs));
  let lastWeek = "";
  return (
    <div>
      {days.slice(0, limit).map((day) => {
        const week = weekStartOf(day.date);
        const divider = week !== lastWeek ? <h2 class={styles.week}>{weekLabel(week, today)}</h2> : null;
        lastWeek = week;
        return (
          <div key={day.date}>
            {divider}
            <DayGroup day={day} multiClub={multiClub} multiZone={multiZone} nowMs={nowMs} onOpen={onOpen} />
          </div>
        );
      })}
      {limit < days.length && <div ref={sentinel} class={styles.sentinel} aria-hidden="true" />}
    </div>
  );
}
