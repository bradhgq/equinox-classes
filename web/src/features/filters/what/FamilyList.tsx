import { displayName } from "../../../../../shared/families.ts";
import type { ClassFamily } from "../../../../../shared/schema.ts";
import { CheckRow } from "../../../components/CheckRow/CheckRow.tsx";
import { FoldGroup } from "../../../components/FoldGroup/FoldGroup.tsx";
import { ListGroup } from "../../../components/ListGroup/ListGroup.tsx";
import { familyCategory } from "../../../lib/catalog.ts";
import { categoryState, familyTicked, toggleCategory, toggleFamily } from "../../../lib/filters/what.ts";
import { perWeekLabel } from "../../../lib/results.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import { useResults } from "../../../state/ResultsContext.tsx";
import styles from "./FamilyList.module.css";

const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Class families, one foldable group per category (owner round 3). The group's
 * checkbox is "All Yoga": it ticks or unticks every class in it. With a query:
 * search names, folded variant titles and category names.
 */
export function FamilyList({ query }: { query: string }) {
  const { catalog, filters, update } = useFilters();
  const { counts } = useResults();
  const weeks = catalog.weeks;
  const countOf = (key: string) => counts.families.get(key) ?? 0;
  const catName = (id: number) => catalog.categories.get(id)?.name ?? "";

  const row = (fam: ClassFamily, meta: string, sublabel?: string, dimmed = false) => (
    <CheckRow
      key={fam.key}
      checked={familyTicked(filters, catalog, fam.key)}
      onChange={() => update((f) => toggleFamily(f, catalog, fam.key))}
      label={fam.name}
      sublabel={sublabel}
      meta={meta}
      dimmed={dimmed}
    />
  );

  if (query.trim()) {
    const q = normalize(query.trim());
    const hits = catalog.index.families
      .map((fam) => {
        const variant = fam.variants.find((v) => normalize(v).includes(q) && normalize(displayName(v)) !== normalize(fam.name));
        const ok = normalize(fam.name).includes(q) || normalize(catName(fam.categoryId)).includes(q) || variant !== undefined;
        return ok ? { fam, variant: variant ? displayName(variant) : undefined } : null;
      })
      .filter((h): h is { fam: ClassFamily; variant: string | undefined } => h !== null);
    const yours = hits.filter((h) => countOf(h.fam.key) > 0).sort((a, b) => countOf(b.fam.key) - countOf(a.fam.key));
    const elsewhere = hits.filter((h) => countOf(h.fam.key) === 0).sort((a, b) => b.fam.count - a.fam.count);
    if (hits.length === 0) return <p class={styles.empty}>No classes match “{query}”.</p>;
    return (
      <>
        {yours.length > 0 && (
          <ListGroup title="At your clubs">
            {yours.map(({ fam, variant }) => row(fam, `${catName(fam.categoryId)} · ${perWeekLabel(countOf(fam.key), weeks)}`, variant))}
          </ListGroup>
        )}
        {elsewhere.length > 0 && (
          <ListGroup title="At other clubs">
            {elsewhere.slice(0, 30).map(({ fam, variant }) => row(fam, "Elsewhere", variant, true))}
          </ListGroup>
        )}
      </>
    );
  }

  // Categories with classes at your clubs, or with something ticked.
  const groups = catalog.index.categories
    .map((cat) => {
      const fams = catalog.index.families
        .filter((fam) => familyCategory(catalog, fam.key) === cat.id && (countOf(fam.key) > 0 || filters.families.includes(fam.key)))
        .sort((a, b) => countOf(b.key) - countOf(a.key));
      return { cat, fams };
    })
    .filter(({ cat, fams }) => fams.length > 0 || filters.categories.includes(cat.id));

  return (
    <>
      {groups.map(({ cat, fams }) => {
        const keys = fams.map((fam) => fam.key);
        const state = categoryState(filters, catalog, cat.id, keys);
        const ticked = keys.filter((k) => familyTicked(filters, catalog, k)).length;
        return (
          <FoldGroup
            key={cat.id}
            title={cat.name}
            meta={`${ticked} of ${keys.length}`}
            all={{ state, label: `All ${cat.name} classes`, onToggle: () => update((f) => toggleCategory(f, catalog, cat.id, keys)) }}
            defaultOpen={state === "mixed"}
          >
            {fams.map((fam) => row(fam, countOf(fam.key) ? perWeekLabel(countOf(fam.key), weeks) : "Not scheduled", undefined, !countOf(fam.key)))}
          </FoldGroup>
        );
      })}
    </>
  );
}
