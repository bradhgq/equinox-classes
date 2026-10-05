// Time ranges for the When filter: [start, end) in minutes after midnight,
// club-local. A class matches a range when its start time falls inside it.

export interface TimeRange {
  start: number;
  end: number;
}

export const STEP = 15;
export const FIRST_START = 5 * 60; // 5:00 AM
export const LAST_START = 22 * 60 + 45; // 10:45 PM
export const LAST_END = 23 * 60; // 11:00 PM

export const PRESETS = {
  morning: { label: "Morning", range: { start: 6 * 60, end: 9 * 60 } },
  lunch: { label: "Lunch", range: { start: 11 * 60, end: 14 * 60 } },
  evening: { label: "Evening", range: { start: 17 * 60, end: 20 * 60 } },
} as const;
export type PresetName = keyof typeof PRESETS;

export function inRanges(minute: number, ranges: readonly TimeRange[]): boolean {
  return ranges.some((r) => minute >= r.start && minute < r.end);
}

export function sameRanges(a: readonly TimeRange[] = [], b: readonly TimeRange[] = []): boolean {
  if (a.length !== b.length) return false;
  const key = (rs: readonly TimeRange[]) => rs.map((r) => `${r.start}-${r.end}`).sort().join(",");
  return key(a) === key(b);
}

export function sortRanges(ranges: readonly TimeRange[]): TimeRange[] {
  return [...ranges].sort((x, y) => x.start - y.start || x.end - y.end);
}

/** Every start option for the start select. */
export function startOptions(): number[] {
  const out: number[] = [];
  for (let m = FIRST_START; m <= LAST_START; m += STEP) out.push(m);
  return out;
}

/** Every end option for the end select (callers disable those <= start). */
export function endOptions(): number[] {
  const out: number[] = [];
  for (let m = FIRST_START + STEP; m <= LAST_END; m += STEP) out.push(m);
  return out;
}

/** New start: keep the end if it's still after the start, else start + 1 h (capped). */
export function withStart(range: TimeRange, start: number): TimeRange {
  return { start, end: range.end > start ? range.end : Math.min(start + 60, LAST_END) };
}

export function withEnd(range: TimeRange, end: number): TimeRange {
  return { start: range.start, end: Math.max(end, range.start + STEP) };
}

const covered = (minute: number, ranges: readonly TimeRange[]) => inRanges(minute, ranges);

/**
 * The range "+" adds:
 * - nothing yet -> morning (6-9 AM);
 * - a morning range but nothing covering 5 PM -> evening (5-8 PM);
 * - nothing starting before noon -> morning;
 * - otherwise the first free 3 h block between 5 AM and 11 PM, or null when none.
 */
export function nextRange(existing: readonly TimeRange[]): TimeRange | null {
  const { morning, evening } = PRESETS;
  if (existing.length === 0) return { ...morning.range };
  const hasMorning = existing.some((r) => r.start < 12 * 60);
  if (hasMorning && !covered(evening.range.start, existing)) return { ...evening.range };
  if (!hasMorning) return { ...morning.range };
  for (let start = FIRST_START; start + 180 <= LAST_END; start += 30) {
    let free = true;
    for (let m = start; m < start + 180; m += STEP) {
      if (covered(m, existing)) {
        free = false;
        break;
      }
    }
    if (free) return { start, end: start + 180 };
  }
  return null;
}
