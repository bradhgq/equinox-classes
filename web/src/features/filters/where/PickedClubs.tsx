import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../../../components/Icon/Icon.tsx";
import { SectionLabel } from "../../../components/SectionLabel/SectionLabel.tsx";
import { clearGroup, type PickToken, pickTokens, toggleClub } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import styles from "./PickedClubs.module.css";

const keyOf = (t: PickToken) => (t.kind === "group" ? `group-${t.group.key}` : `club-${t.id}`);

/**
 * "Your clubs": every pick, in any city, removable in one tap, newest first. A whole area is one
 * chip. It always takes the same height, "None yet" included, and its chips sit on one line that
 * scrolls sideways, so picking never moves the list under your finger (critique r6 H1, M1).
 * Clearing everything is the sheet footer's and the rail header's job (M2).
 */
export function PickedClubs({ onEmptied }: { onEmptied: () => void }) {
  const { catalog, filters, update } = useFilters();
  const tokens = pickTokens(filters, catalog);
  const list = useRef<HTMLUListElement>(null);
  const [focusNext, setFocusNext] = useState<string | null>(null);

  // After a removal, focus moves to the neighbouring chip (or the search field), not <body> (L1).
  useEffect(() => {
    if (focusNext === null) return;
    const target = list.current?.querySelector<HTMLElement>(`[data-focus-key="${focusNext}"]`);
    if (target) target.focus();
    else onEmptied();
    setFocusNext(null);
  }, [focusNext]);

  const remove = (t: PickToken, index: number) => {
    const neighbour = tokens[index + 1] ?? tokens[index - 1];
    if (t.kind === "group") update((f) => clearGroup(f, t.group), { undoLabel: `Cleared ${t.group.name}` });
    else update((f) => toggleClub(f, catalog, t.id), { undoLabel: `Removed ${catalog.clubs.get(t.id)!.shortName}` });
    setFocusNext(neighbour ? keyOf(neighbour) : "");
  };

  return (
    <div class={styles.wrap}>
      <SectionLabel as="h3" flush>
        Your clubs{filters.clubs.length ? ` · ${filters.clubs.length}` : ""}
      </SectionLabel>
      {tokens.length === 0 ? (
        <p class={styles.none}>None yet</p>
      ) : (
        <ul ref={list} class={styles.list}>
          {tokens.map((t, i) => {
            const label = t.kind === "group" ? `${t.group.name} · ${t.count}` : catalog.clubs.get(t.id)!.shortName;
            return (
              <li key={keyOf(t)}>
                <button
                  type="button"
                  class={styles.pick}
                  data-focus-key={keyOf(t)}
                  // Starts with the visible text, so voice control can find it (label in name).
                  aria-label={t.kind === "group" ? `Remove ${label} clubs` : `Remove ${label}`}
                  onClick={() => remove(t, i)}
                >
                  <span>{label}</span>
                  <Icon name="close" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
