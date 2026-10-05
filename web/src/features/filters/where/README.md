# where/

Clubs are the only thing you pick (owner round 6, `docs/design/05-where-flow.md`, revised after
`06-critique.md`).

- `WherePanel.tsx`: search every club, your picks, then one city's clubs. Opens on a city or in
  search when the first-run screen asks (`WhereIntent`); the control it names gets
  `data-autofocus`.
- `ClubSearch.tsx`: ranked results across all cities (`lib/clubSearch.ts`), an empty state that
  says why, and the count announced once typing settles.
- `PickedClubs.tsx`: "Your clubs": every pick as a removable chip, newest first, a whole area as one
  chip. Always the same height ("None yet"), so picking never moves the list.
- `CitySelect.tsx`: which city or region's clubs are listed. Browsing only; never changes picks.
- `CityClubs.tsx`: a city's clubs, one foldable section per area. "Select all 13 Downtown clubs"
  sits inside the open section; a city without areas is one untitled list.
- `useCitiesBySize.ts`: cities and regions, most clubs first, by the count people see.
