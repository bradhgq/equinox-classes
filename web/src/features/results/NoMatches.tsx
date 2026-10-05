import { Button } from "../../components/Button/Button.tsx";
import { EmptyState } from "../../components/EmptyState/EmptyState.tsx";
import { listJoin, whatSummary } from "../../lib/filters/summary.ts";
import type { Filters } from "../../lib/filters/types.ts";
import { allClasses, isAnyClass } from "../../lib/filters/what.ts";
import { clearWhen } from "../../lib/filters/when.ts";
import { DAY_SHORT, formatClock, minutesOf, weekdayOf, dateOf } from "../../lib/time.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { useResults } from "../../state/ResultsContext.tsx";

interface Fix {
  label: string;
  next: Filters;
  count: number;
}

/** Nothing matches: one-tap fixes, each with the count it would give, plus where the class does run. */
export function NoMatches() {
  const { catalog, filters, update } = useFilters();
  const { resultsWith } = useResults();

  const candidates: Omit<Fix, "count">[] = [
    ...filters.days
      .filter((d) => (filters.ranges[d] ?? []).length > 0)
      .map((d) => ({ label: `Any time on ${DAY_SHORT[d]}`, next: { ...filters, ranges: { ...filters.ranges, [d]: [] } } })),
    ...(filters.days.length ? [{ label: "Any day, any time", next: clearWhen(filters) }] : []),
    ...(!isAnyClass(filters, catalog) ? [{ label: "Any class", next: allClasses(filters, catalog) }] : []),
  ];
  const fixes: Fix[] = candidates.map((c) => ({ ...c, count: resultsWith(c.next).count })).filter((f) => f.count > 0);

  // Where the chosen classes do run, ignoring days and times (up to three slots).
  let hint = "";
  if (!isAnyClass(filters, catalog) && filters.days.length) {
    const relaxed = resultsWith(clearWhen(filters));
    const slots: string[] = [];
    const seen = new Set<string>();
    // One slot per weekday, so the hint shows when in the week it runs (critique L7).
    for (const day of relaxed.days) {
      for (const { c, club } of day.items) {
        const key = String(weekdayOf(dateOf(c.startLocal)));
        if (seen.has(key)) continue;
        seen.add(key);
        slots.push(`${DAY_SHORT[weekdayOf(dateOf(c.startLocal))]} ${formatClock(minutesOf(c.startLocal))}${relaxed.multiClub ? ` at ${club.shortName}` : ""}`);
        if (slots.length === 3) break;
      }
      if (slots.length === 3) break;
    }
    if (slots.length) hint = `${whatSummary(filters, catalog).line1.replace(/^All /, "")} runs ${listJoin(slots)}.`;
  }

  return (
    <EmptyState
      title="No classes match."
      text={fixes.length ? "Loosen one filter:" : "Try other clubs or filters."}
      actions={fixes.map((f) => (
        <Button key={f.label} onClick={() => update(() => f.next)}>
          {f.label} · {f.count}
        </Button>
      ))}
      footnote={hint || undefined}
    />
  );
}
