import type { Club, City } from "../../../../../shared/schema.ts";
import { Button } from "../../../components/Button/Button.tsx";
import { CheckRow } from "../../../components/CheckRow/CheckRow.tsx";
import { FoldGroup } from "../../../components/FoldGroup/FoldGroup.tsx";
import { type ClubGroup, groupsOfCity } from "../../../lib/catalog.ts";
import { normalize } from "../../../lib/clubSearch.ts";
import { clearGroup, groupAllPicked, selectGroup, tickedIn, toggleClub, visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import styles from "./CityClubs.module.css";

/** "13 clubs", "2 of 13 picked", "All 13 picked": a count with its noun (critique r6 H2, L1). */
const countCopy = (picked: number, total: number) =>
  picked === 0 ? `${total} ${total === 1 ? "club" : "clubs"}` : picked === total ? `All ${total} picked` : `${picked} of ${total} picked`;

/**
 * One city's clubs (owner round 6). Checkboxes are on clubs only. A city with areas gets a
 * foldable section per area: those holding picks start open, the rest folded, so the areas read
 * as a short list. Picking a whole area is a deliberate step inside the open section, under the
 * clubs it would load (critique r6 H2). A city without areas is one untitled list, since the
 * City select already names it (L2).
 */
export function CityClubs({ city }: { city: City }) {
  const { catalog, filters, update } = useFilters();
  const groups = groupsOfCity(city).map((g) => ({ g, ids: visibleIds(filters, catalog, g.clubIds) })).filter(({ ids }) => ids.length > 0);

  const clubRows = (ids: string[]) =>
    ids
      .map((id) => catalog.clubs.get(id)!)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((club) => (
        <CheckRow
          key={club.id}
          checked={filters.clubs.includes(club.id)}
          onChange={() => update((f) => toggleClub(f, catalog, club.id))}
          label={club.name}
          meta={townLabel(club, city)}
        />
      ));

  // No bulk action for a group of one: it would just be the club's own checkbox (L2).
  const bulk = (g: ClubGroup, total: number) =>
    total > 1 && (
      <div class={styles.bulk}>
        {groupAllPicked(filters, catalog, g) ? (
          <Button variant="text" size="sm" label={`Clear all ${total} ${g.name} clubs`} onClick={() => update((f) => clearGroup(f, g), { undoLabel: `Cleared ${g.name}` })}>
            Clear all {total}
          </Button>
        ) : (
          <Button variant="text" size="sm" onClick={() => update((f) => selectGroup(f, catalog, g), { undoLabel: `Picked all ${g.name}` })}>
            Select all {total} {g.name} clubs
          </Button>
        )}
      </div>
    );

  if (city.areas.length === 0) {
    const [{ g, ids }] = groups.length ? groups : [{ g: groupsOfCity(city)[0], ids: [] as string[] }];
    return (
      <div>
        {bulk(g, ids.length)}
        {clubRows(ids)}
      </div>
    );
  }

  return (
    <div>
      {groups.map(({ g, ids }) => {
        const picked = tickedIn(filters, ids).length;
        return (
          <FoldGroup key={g.key} title={g.name} meta={countCopy(picked, ids.length)} defaultOpen={picked > 0}>
            {bulk(g, ids.length)}
            {clubRows(ids)}
          </FoldGroup>
        );
      })}
    </div>
  );
}

/** A club's town, only when it adds something: not the city's name, not already in the club's name (L2). */
function townLabel(club: Club, city: City): string | undefined {
  if (!club.town || club.town === city.name || normalize(club.name).includes(normalize(club.town))) return undefined;
  return club.town;
}
