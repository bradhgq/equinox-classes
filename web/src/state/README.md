# state/

- `FiltersContext.tsx`: the filter state. Initial value from cookie, shared link or tab view; debounced persistence; undo; KEEP/CLEAR.
- `persistence.ts`: cookie + `/prefs` refresh, sessionStorage view, absorbing the share link from the URL.
- `ResultsContext.tsx`: derived results, counts and loading state, computed once in `App`;
  `isSettled` (every club loaded or failed).
