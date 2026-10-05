import type { ComponentChildren, JSX } from "preact";
import { Button } from "../../components/Button/Button.tsx";
import { Sheet } from "../../components/Sheet/Sheet.tsx";
import { useKeyboardOpen } from "../../hooks/useKeyboardOpen.ts";
import { isAnyClass } from "../../lib/filters/what.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { isSettled, useResults } from "../../state/ResultsContext.tsx";
import { allClasses, CLEAR_LABEL, clearFilter, nothingPicked } from "./clear.ts";
import { FILTER_TITLES, type FilterName, useSummaries } from "./useSummaries.ts";
import { WhatPanel } from "./what/WhatPanel.tsx";
import { WhenPanel } from "./when/WhenPanel.tsx";
import { type WhereIntent, WherePanel } from "./where/WherePanel.tsx";

interface Props {
  open: FilterName | null;
  onClose: () => void;
  /** The app's toast, rendered inside the sheet while it's open. */
  toast?: ComponentChildren;
  /** Where to start the Where picker (a city or search, from the first-run screen). */
  whereIntent?: WhereIntent | null;
}

const PANELS: Record<FilterName, (whereIntent: WhereIntent | null | undefined) => JSX.Element> = {
  where: (whereIntent) => <WherePanel intent={whereIntent} />,
  when: () => <WhenPanel />,
  what: () => <WhatPanel />,
};

const PICK_LABEL: Record<FilterName, string> = { where: "Pick a club", when: "", what: "Pick a class" };

/** Phones and tablets: each filter in its own sheet. Changes apply live; the footer shows the count. */
export function FilterSheets({ open, onClose, toast, whereIntent }: Props) {
  const { catalog, filters, update } = useFilters();
  const { results, loading } = useResults();
  const summaries = useSummaries();
  const keyboardOpen = useKeyboardOpen();
  if (!open) return null;

  const stillLoading = !isSettled(loading);
  const empty = nothingPicked(filters, catalog, open);
  const countText = stillLoading ? "Loading…" : `Show ${results.count.toLocaleString()} ${results.count === 1 ? "class" : "classes"}`;
  // What's default is "any class", so the footer offers Clear from there and Select all from nothing.
  // What has nothing to act on before a club is picked (critique r6, outside the round).
  const hasClubs = !nothingPicked(filters, catalog, "where");
  const showClear = open === "what" ? hasClubs && !empty : !summaries[open].empty;
  const showSelectAll = open === "what" && hasClubs && !isAnyClass(filters, catalog) && empty;

  return (
    <Sheet
      open
      title={FILTER_TITLES[open]}
      onClose={onClose}
      hideFooter={keyboardOpen}
      toast={toast}
      returnFocusKey={`filter-${open}`}
      footer={
        <>
          {showClear && (
            <Button variant="text" onClick={() => update((f) => clearFilter(f, open), { undoLabel: CLEAR_LABEL[open] })}>
              Clear
            </Button>
          )}
          {showSelectAll && (
            <Button variant="text" onClick={() => update((f) => allClasses(f, catalog))}>
              Select all
            </Button>
          )}
          <Button variant="primary" class="grow" onClick={onClose} disabled={empty}>
            {empty ? PICK_LABEL[open] : countText}
          </Button>
          {/* The page behind is inert while a sheet is open, so announce counts here (critique M7). */}
          <span class="visually-hidden" aria-live="polite">
            {stillLoading || empty ? "" : `${results.count} classes`}
          </span>
        </>
      }
    >
      {PANELS[open](whereIntent)}
    </Sheet>
  );
}
