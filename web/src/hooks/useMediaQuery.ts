import { useEffect, useState } from "preact/hooks";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Desktop layout: filter rail + results (handoff §3). */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/** Phones and tablets: where the Equinox app lives. */
export const useIsTouch = () => useMediaQuery("(pointer: coarse)");
