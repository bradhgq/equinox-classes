import { Button } from "../../components/Button/Button.tsx";
import { isNoClass } from "../../lib/filters/what.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { allClasses, CLEAR_LABEL, clearFilter } from "./clear.ts";
import { RailPanel } from "./RailPanel.tsx";
import { type FilterName, useSummaries } from "./useSummaries.ts";
import { WhatPanel } from "./what/WhatPanel.tsx";
import { WhenPanel } from "./when/WhenPanel.tsx";
import { WherePanel } from "./where/WherePanel.tsx";
import styles from "./FilterRail.module.css";

interface Props {
  /** Ask a panel to open and scroll into view (from the "Narrow it down" hint). */
  reveal: { panel: FilterName; nonce: number } | null;
}

/** Desktop: the three filters stacked in a sticky, independently scrolling rail. */
export function FilterRail({ reveal }: Props) {
  const { catalog, filters, update } = useFilters();
  const summaries = useSummaries();
  const nonce = (p: FilterName) => (reveal?.panel === p ? reveal.nonce : undefined);
  const clearButton = (p: FilterName) => (
    <Button variant="text" size="sm" label={`Clear ${p}`} onClick={() => update((f) => clearFilter(f, p), { undoLabel: CLEAR_LABEL[p] })}>
      Clear
    </Button>
  );
  const whatAction = isNoClass(filters) ? (
    <Button variant="text" size="sm" onClick={() => update((f) => allClasses(f, catalog))}>
      Select all
    </Button>
  ) : (
    clearButton("what")
  );

  return (
    <aside class={styles.rail} aria-label="Filters">
      {/* Where starts collapsed: once clubs are picked (critique M5), and on first run too,
          where the hero already shows the city chips (critique M6). */}
      <RailPanel
        id="rail-where"
        title="Where"
        summary={summaries.where}
        defaultOpen={false}
        revealNonce={nonce("where")}
        actions={!summaries.where.empty && clearButton("where")}
      >
        <WherePanel />
      </RailPanel>
      <RailPanel id="rail-when" title="When" summary={summaries.when} defaultOpen revealNonce={nonce("when")} actions={!summaries.when.empty && clearButton("when")}>
        <WhenPanel />
      </RailPanel>
      <RailPanel id="rail-what" title="What" summary={summaries.what} defaultOpen revealNonce={nonce("what")} actions={whatAction}>
        <WhatPanel />
      </RailPanel>
    </aside>
  );
}
