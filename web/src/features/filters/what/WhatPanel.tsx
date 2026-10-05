import { useState } from "preact/hooks";
import { SearchField } from "../../../components/SearchField/SearchField.tsx";
import { SectionLabel } from "../../../components/SectionLabel/SectionLabel.tsx";
import { useKeyboardOpen } from "../../../hooks/useKeyboardOpen.ts";
import { effectiveClubIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { CategoryChips } from "./CategoryChips.tsx";
import { FamilyList } from "./FamilyList.tsx";
import styles from "./WhatPanel.module.css";

/**
 * What: category chips, then class families with search (handoff §5.5).
 * While searching on a phone the chips fold away so results get the room (critique H4).
 */
export function WhatPanel() {
  const { catalog, filters } = useFilters();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  const searching = query.trim().length > 0 || (focused && keyboardOpen);

  // Class types come from the chosen clubs' schedules (critique M6: no empty sections).
  if (effectiveClubIds(filters, catalog).length === 0) {
    return <p class={styles.hint}>Pick clubs to see class types.</p>;
  }

  return (
    <div class={searching ? styles.searching : undefined}>
      <div class={styles.categories}>
        <SectionLabel>Category</SectionLabel>
        <CategoryChips />
      </div>
      <SectionLabel>Class</SectionLabel>
      <SearchField value={query} onInput={setQuery} onFocusChange={setFocused} label="Search classes" placeholder="Search classes or categories" />
      <FamilyList query={query} />
    </div>
  );
}
