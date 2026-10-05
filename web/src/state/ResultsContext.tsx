import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Filters } from "../lib/filters/types.ts";
import type { Results } from "../lib/results.ts";

/** Derived data for the current filters, computed once in App and read by panels and views. */
export interface ResultsApi {
  results: Results;
  /** Results for other filters over the same loaded clubs (for "no matches" quick fixes). */
  resultsWith: (filters: Filters) => Results;
  counts: { families: Map<string, number>; categories: Map<number, number> };
  /** Failed clubs count as settled: they never leave "Loading…" up (critique M3). */
  loading: { loaded: number; failed: number; total: number; clubKey: string };
  failedIds: string[];
  retry: (clubId: string) => void;
}

export const ResultsContext = createContext<ResultsApi | null>(null);

export function useResults(): ResultsApi {
  const api = useContext(ResultsContext);
  if (!api) throw new Error("useResults outside ResultsContext");
  return api;
}

export const isSettled = (l: ResultsApi["loading"]) => l.loaded + l.failed >= l.total;
