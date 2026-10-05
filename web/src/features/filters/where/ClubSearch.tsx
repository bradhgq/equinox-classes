import { useEffect, useState } from "preact/hooks";
import { CheckRow } from "../../../components/CheckRow/CheckRow.tsx";
import { ListGroup } from "../../../components/ListGroup/ListGroup.tsx";
import { searchClubs } from "../../../lib/clubSearch.ts";
import { toggleClub } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import styles from "./WherePanel.module.css";

const clubsLabel = (n: number) => `${n} ${n === 1 ? "club" : "clubs"}`;

/**
 * Search across every club in every city (critique r6 M3): word starts, names first, the town
 * shown when it explains a match, and shorthand like "nyc". The count is announced once typing
 * settles.
 */
export function ClubSearch({ query }: { query: string }) {
  const { catalog, filters, update } = useFilters();
  const { hits, withoutClasses } = searchClubs(catalog, query, filters.clubs);
  const shown = query.trim();
  const emptyText =
    withoutClasses.length === 1
      ? `${withoutClasses[0].name} has no classes on the schedule right now.`
      : withoutClasses.length > 1
        ? `${withoutClasses.length} matching clubs have no classes on the schedule right now.`
        : `No clubs match “${shown}”. Try a club or neighborhood name, or clear the search to browse.`;

  // Screen readers hear what's on screen, once typing settles.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(hits.length ? clubsLabel(hits.length) : emptyText), 500);
    return () => clearTimeout(t);
  }, [hits.length, emptyText]);

  return (
    <div>
      <p class="visually-hidden" aria-live="polite">
        {announced}
      </p>
      {hits.length > 0 ? (
        <ListGroup title={clubsLabel(hits.length)}>
          {hits.map(({ club, place }) => (
            <CheckRow
              key={club.id}
              checked={filters.clubs.includes(club.id)}
              onChange={() => update((f) => toggleClub(f, catalog, club.id))}
              label={club.name}
              sublabel={place}
            />
          ))}
        </ListGroup>
      ) : (
        <p class={styles.empty}>{emptyText}</p>
      )}
    </div>
  );
}
