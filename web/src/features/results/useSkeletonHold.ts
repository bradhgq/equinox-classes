import { useEffect, useRef, useState } from "preact/hooks";
import { isSettled, type ResultsApi } from "../../state/ResultsContext.tsx";

/** Long enough for a typical city to arrive in one piece; short enough not to feel stuck. */
const HOLD_MS = 1000;

/**
 * True while the skeleton should stay up even though some clubs have loaded.
 *
 * On a cold load (none of the clubs cached) rows would otherwise trickle in and
 * reshuffle each day as files land (critique L11), so the skeleton holds until
 * every club settles or HOLD_MS passes. A warm change, like adding one club to a
 * list already on screen, never holds: keeping that list beats flashing a skeleton.
 */
export function useSkeletonHold(loading: ResultsApi["loading"]): boolean {
  const start = useRef({ clubKey: "", cold: false, at: 0 });
  if (start.current.clubKey !== loading.clubKey) {
    start.current = { clubKey: loading.clubKey, cold: loading.loaded === 0, at: Date.now() };
  }
  const remaining = start.current.at + HOLD_MS - Date.now();
  const holding = start.current.cold && !isSettled(loading) && remaining > 0;

  // Re-render when the hold runs out, in case no file lands to trigger one.
  const [, expire] = useState(0);
  useEffect(() => {
    if (!holding) return;
    const t = setTimeout(() => expire((n) => n + 1), remaining);
    return () => clearTimeout(t);
  }, [holding, loading.clubKey]);

  return holding;
}
