import { useLayoutEffect, useRef } from "preact/hooks";
import { type FilterName, FILTER_TITLES, useSummaries } from "./useSummaries.ts";
import styles from "./FilterBar.module.css";

interface Props {
  onOpen: (filter: FilterName) => void;
}

/** Publish the bar's real height for sticky day headers (separate from its own min-height, critique L3). */
function usePublishedHeight(el: { current: HTMLElement | null }) {
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--filterbar-sticky", `${node.getBoundingClientRect().height}px`));
    ro.observe(node);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--filterbar-sticky");
    };
  }, []);
}

/** Phones and tablets: three sticky cells, each a two-line summary that opens its sheet. */
export function FilterBar({ onOpen }: Props) {
  const summaries = useSummaries();
  const bar = useRef<HTMLElement>(null);
  usePublishedHeight(bar);
  return (
    <nav ref={bar} class={styles.bar} aria-label="Filters">
      {(Object.keys(FILTER_TITLES) as FilterName[]).map((name) => {
        const s = summaries[name];
        const cta = s.action === true; // "Choose clubs" / "No classes" need attention
        return (
          <button
            key={name}
            data-focus-key={`filter-${name}`}
            type="button"
            class={`${styles.cell} ${s.empty ? "" : styles.set}`}
            aria-haspopup="dialog"
            onClick={() => onOpen(name)}
          >
            <span class={styles.label}>{FILTER_TITLES[name]}</span>
            <span class={`${styles.line1} ${s.empty && !cta ? styles.placeholder : ""} ${cta ? styles.cta : ""}`}>{s.line1}</span>
            {s.line2 && <span class={styles.line2}>{s.line2}</span>}
          </button>
        );
      })}
    </nav>
  );
}
