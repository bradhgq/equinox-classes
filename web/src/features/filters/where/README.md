# where/

- `WherePanel.tsx`: city block (collapses once chosen), then the club list with search.
- `CityChips.tsx`: city chips, most clubs first. Cities with areas open the AreaPopover; others
  tick or untick all their clubs.
- `AreaPopover.tsx`: pick a city's areas next to its chip: ALL / GO (REMOVE). Partly picked
  areas show a dash and stay as they are unless tapped.
- `ClubList.tsx`: one foldable group per area. The group checkbox ticks or unticks all its
  clubs. Search spans the cities in play.
