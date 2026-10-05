import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { ClubSchedule } from "../../../shared/schema.ts";
import { fetchClubSchedule } from "./api.ts";

const MAX_CONCURRENT = 6;

// Module-level cache: schedules survive filter changes for the whole visit.
const loaded = new Map<string, ClubSchedule>();
const failed = new Set<string>();
const inFlight = new Map<string, Promise<void>>();
let active = 0;
const queue: (() => void)[] = [];

function limited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT) run();
    else queue.push(run);
  });
}

function load(clubId: string): Promise<void> {
  const existing = inFlight.get(clubId);
  if (existing) return existing;
  failed.delete(clubId);
  const p = limited(() => fetchClubSchedule(clubId))
    .then((s) => {
      loaded.set(clubId, s);
    })
    .catch(() => {
      failed.add(clubId);
    })
    .finally(() => inFlight.delete(clubId));
  inFlight.set(clubId, p);
  return p;
}

export interface SchedulesState {
  /** Loaded schedules for the requested clubs. Same array until something changes (critique C1). */
  schedules: ClubSchedule[];
  loadedCount: number;
  failedIds: string[];
  total: number;
  retry: (clubId: string) => void;
}

/** Loads the schedule file of every requested club, at most 6 at a time. */
export function useSchedules(clubIds: readonly string[]): SchedulesState {
  // Bumped whenever a load settles, so the memo below only recomputes then.
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((n) => n + 1), []);
  const key = clubIds.join(",");

  useEffect(() => {
    let alive = true;
    for (const id of clubIds) {
      if (!loaded.has(id) && !failed.has(id)) load(id).then(() => alive && bump());
    }
    return () => {
      alive = false;
    };
  }, [key]);

  const retry = useCallback(
    (clubId: string) => {
      failed.delete(clubId);
      bump();
      load(clubId).then(bump);
    },
    [bump],
  );

  return useMemo(() => {
    const ids = key ? key.split(",") : [];
    const schedules = ids.map((id) => loaded.get(id)).filter((s): s is ClubSchedule => s !== undefined);
    return { schedules, loadedCount: schedules.length, failedIds: ids.filter((id) => failed.has(id)), total: ids.length, retry };
  }, [key, version, retry]);
}
