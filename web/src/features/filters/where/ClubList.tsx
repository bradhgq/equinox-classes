import type { Club } from "../../../../../shared/schema.ts";
import { CheckRow } from "../../../components/CheckRow/CheckRow.tsx";
import { FoldGroup } from "../../../components/FoldGroup/FoldGroup.tsx";
import { ListGroup } from "../../../components/ListGroup/ListGroup.tsx";
import { groupsOfCity } from "../../../lib/catalog.ts";
import { groupState, tickedIn, toggleClub, toggleGroup, visibleIds } from "../../../lib/filters/where.ts";
import { useFilters } from "../../../state/FiltersContext.tsx";
import styles from "./ClubList.module.css";

interface Props {
  query: string;
}

const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Clubs of the cities in play, one foldable group per area (owner round 3):
 * the group's checkbox ticks or unticks all its clubs. With a query, a flat
 * search across every club in those cities.
 */
export function ClubList({ query }: Props) {
  const { catalog, filters, update } = useFilters();
  const cities = catalog.index.cities.filter((c) => filters.cities.includes(c.slug));
  const multiCity = cities.length > 1;
  const clubRow = (club: Club, meta?: string) => (
    <CheckRow
      key={club.id}
      checked={filters.clubs.includes(club.id)}
      onChange={() => update((f) => toggleClub(f, catalog, club.id))}
      label={club.name}
      meta={meta}
    />
  );
  const areaName = (club: Club) => (club.area ? catalog.areas.get(club.area)?.name : club.town) ?? "";

  if (query.trim()) {
    const q = normalize(query.trim());
    const hits = cities
      .flatMap((c) => visibleIds(filters, catalog, c.clubIds))
      .map((id) => catalog.clubs.get(id)!)
      .filter((club) => [club.name, club.shortName, club.town ?? "", areaName(club)].some((s) => normalize(s).includes(q)));
    if (hits.length === 0) return <p class={styles.empty}>No clubs match “{query}”.</p>;
    return <ListGroup title={`${hits.length} ${hits.length === 1 ? "club" : "clubs"}`}>{hits.map((c) => clubRow(c, areaName(c)))}</ListGroup>;
  }

  return (
    <>
      {cities.flatMap((city) =>
        groupsOfCity(city).map((g) => {
          const ids = visibleIds(filters, catalog, g.clubIds);
          const clubs = ids.map((id) => catalog.clubs.get(id)!).sort((a, b) => a.name.localeCompare(b.name));
          const state = groupState(filters, catalog, g);
          const title = multiCity && city.areas.length > 0 ? `${city.name} — ${g.name}` : g.name;
          return (
            <FoldGroup
              key={g.key}
              title={title}
              meta={`${tickedIn(filters, ids).length} of ${ids.length}`}
              state={state}
              allLabel={`All ${g.name} clubs`}
              onToggleAll={() => update((f) => toggleGroup(f, catalog, g))}
              defaultOpen={state === "mixed" || groupsOfCity(city).length === 1}
            >
              {clubs.map((club) => clubRow(club, city.areas.length === 0 && club.town && club.town !== city.name ? club.town : undefined))}
            </FoldGroup>
          );
        }),
      )}
    </>
  );
}
