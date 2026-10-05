import { useState } from "preact/hooks";
import type { City } from "../../../../../shared/schema.ts";
import { Button } from "../../../components/Button/Button.tsx";
import { CheckRow } from "../../../components/CheckRow/CheckRow.tsx";
import { Popover } from "../../../components/Popover/Popover.tsx";
import { groupsOfCity } from "../../../lib/catalog.ts";
import { type AreaDecision, groupState, tickedIn, visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import styles from "./AreaPopover.module.css";

interface Props {
  city: City;
  anchor: HTMLElement;
  onApply: (decisions: Record<string, AreaDecision>) => void;
  onClose: () => void;
}

const CHECKED: Record<AreaDecision, boolean | "mixed"> = { all: true, none: false, keep: "mixed" };

/**
 * Pick a city's areas (owner: a popover right by the chip with ALL and GO).
 * Areas you've partly picked show a dash and stay as they are unless you tap them.
 * Nothing changes until ALL or GO; Esc / outside tap cancels.
 */
export function AreaPopover({ city, anchor, onApply, onClose }: Props) {
  const { catalog, filters } = useFilters();
  const groups = groupsOfCity(city);
  const [choice, setChoice] = useState<Record<string, AreaDecision>>(() =>
    Object.fromEntries(
      groups.map((g) => {
        const state = groupState(filters, catalog, g);
        return [g.key, state === "on" ? "all" : state === "off" ? "none" : "keep"];
      }),
    ),
  );
  const visibleCount = (ids: readonly string[]) => visibleIds(filters, catalog, ids).length;
  const cityHasTicks = tickedIn(filters, city.clubIds).length > 0;
  const allNone = groups.every((g) => choice[g.key] === "none");

  // Tapping a partial area makes it "all"; then it toggles all <-> none.
  const toggle = (key: string) => setChoice((c) => ({ ...c, [key]: c[key] === "all" ? "none" : "all" }));

  return (
    <Popover
      anchor={anchor}
      open
      onClose={onClose}
      label={`${city.name} areas`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onApply(Object.fromEntries(groups.map((g) => [g.key, "all"])))}>
            All
          </Button>
          <Button variant="primary" disabled={allNone && !cityHasTicks} onClick={() => onApply(choice)}>
            {allNone && cityHasTicks ? "Remove" : "Go"}
          </Button>
        </>
      }
    >
      <div class={styles.head}>
        <p class={styles.title}>{city.name}</p>
        <p class={styles.sub}>{visibleCount(city.clubIds)} clubs</p>
      </div>
      {groups.map((g) => (
        <CheckRow key={g.key} checked={CHECKED[choice[g.key]]} onChange={() => toggle(g.key)} label={g.name} meta={`${visibleCount(g.clubIds)} clubs`} />
      ))}
    </Popover>
  );
}
