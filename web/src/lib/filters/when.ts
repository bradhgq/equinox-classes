// When: weekdays and per-day time ranges (handoff §5.4).
//
// Session memory (not persisted, not in links) drives two defaults:
// - touched: days most recently selected or edited, newest first. A newly
//   selected day copies the newest touched day's ranges (the owner's rule).
// - parked: ranges of days switched off this session, restored if switched back on.

import { type PresetName, PRESETS, type TimeRange, nextRange, sameRanges, sortRanges } from "../ranges.ts";
import { type Filters, without } from "./types.ts";

export interface WhenMemory {
  touched: number[];
  parked: Record<number, TimeRange[]>;
}

export const EMPTY_MEMORY: WhenMemory = { touched: [], parked: {} };

export interface WhenUpdate {
  filters: Filters;
  memory: WhenMemory;
}

const touch = (mem: WhenMemory, day: number): WhenMemory => ({ ...mem, touched: [day, ...without(mem.touched, day)] });

/**
 * The day whose times new days copy: the newest touched day that is still selected.
 * With no memory (e.g. after a reload), the first day with the most common time
 * ranges, so "Copy …'s times" never offers to spread an "Any time" day (critique L2).
 */
export function lastTouchedDay(f: Filters, mem: WhenMemory): number | null {
  const fromMemory = mem.touched.find((d) => f.days.includes(d));
  if (fromMemory !== undefined) return fromMemory;
  if (f.days.length === 0) return null;
  const key = (d: number) => (f.ranges[d] ?? []).map((r) => `${r.start}-${r.end}`).join(",");
  const counts = new Map<string, number>();
  for (const d of f.days) if (key(d)) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
  let best: number | null = null;
  for (const d of f.days) if (key(d) && (best === null || counts.get(key(d))! > counts.get(key(best))!)) best = d;
  return best ?? f.days[f.days.length - 1];
}

function rangesForNewDay(f: Filters, mem: WhenMemory, day: number): TimeRange[] {
  const parked = mem.parked[day];
  if (parked) return parked.map((r) => ({ ...r }));
  const source = lastTouchedDay(f, mem);
  return source === null ? [] : (f.ranges[source] ?? []).map((r) => ({ ...r }));
}

function addDay(f: Filters, mem: WhenMemory, day: number): WhenUpdate {
  const ranges = rangesForNewDay(f, mem, day);
  const parked = { ...mem.parked };
  delete parked[day];
  return {
    filters: { ...f, days: [...f.days, day].sort((a, b) => a - b), ranges: { ...f.ranges, [day]: ranges } },
    memory: touch({ ...mem, parked }, day),
  };
}

function removeDay(f: Filters, mem: WhenMemory, day: number): WhenUpdate {
  const ranges = { ...f.ranges };
  const parkedRanges = ranges[day] ?? [];
  delete ranges[day];
  return {
    filters: { ...f, days: without(f.days, day), ranges },
    memory: { touched: without(mem.touched, day), parked: { ...mem.parked, [day]: parkedRanges } },
  };
}

export function toggleDay(f: Filters, mem: WhenMemory, day: number): WhenUpdate {
  return f.days.includes(day) ? removeDay(f, mem, day) : addDay(f, mem, day);
}

/** Shortcut buttons: select exactly these days; the same shortcut again clears them. */
export function setDays(f: Filters, mem: WhenMemory, days: readonly number[]): WhenUpdate {
  const target = [...days].sort((a, b) => a - b);
  const same = target.length === f.days.length && target.every((d, i) => d === f.days[i]);
  const goal = same ? [] : target;
  let update: WhenUpdate = { filters: f, memory: mem };
  for (const d of f.days) if (!goal.includes(d)) update = removeDay(update.filters, update.memory, d);
  for (const d of goal) if (!update.filters.days.includes(d)) update = addDay(update.filters, update.memory, d);
  return update;
}

function setRanges(f: Filters, mem: WhenMemory, day: number, ranges: TimeRange[]): WhenUpdate {
  return { filters: { ...f, ranges: { ...f.ranges, [day]: sortRanges(ranges) } }, memory: touch(mem, day) };
}

/** "+": add the next sensible range, or do nothing when the day is full. */
export function addRange(f: Filters, mem: WhenMemory, day: number): WhenUpdate {
  const existing = f.ranges[day] ?? [];
  const next = nextRange(existing);
  return next ? setRanges(f, mem, day, [...existing, next]) : { filters: f, memory: mem };
}

export function applyPreset(f: Filters, mem: WhenMemory, day: number, preset: PresetName): WhenUpdate {
  return setRanges(f, mem, day, [...(f.ranges[day] ?? []), { ...PRESETS[preset].range }]);
}

export function updateRange(f: Filters, mem: WhenMemory, day: number, index: number, range: TimeRange): WhenUpdate {
  const ranges = [...(f.ranges[day] ?? [])];
  ranges[index] = range;
  return setRanges(f, mem, day, ranges);
}

export function removeRange(f: Filters, mem: WhenMemory, day: number, index: number): WhenUpdate {
  return setRanges(f, mem, day, (f.ranges[day] ?? []).filter((_, i) => i !== index));
}

/** "Apply Mon's times to Wed and Sat". */
export function applyToAll(f: Filters, mem: WhenMemory, fromDay: number): WhenUpdate {
  const source = f.ranges[fromDay] ?? [];
  const ranges: Record<number, TimeRange[]> = {};
  for (const d of f.days) ranges[d] = source.map((r) => ({ ...r }));
  return { filters: { ...f, ranges }, memory: touch(mem, fromDay) };
}

/** Whether the selected days carry different ranges (shows the apply helper). */
export function rangesDiffer(f: Filters): boolean {
  if (f.days.length < 2) return false;
  const first = f.ranges[f.days[0]] ?? [];
  return f.days.some((d) => !sameRanges(f.ranges[d] ?? [], first));
}

/** Clear all of When. */
export function clearWhen(f: Filters): Filters {
  return { ...f, days: [], ranges: {} };
}
