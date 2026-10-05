# filters/

- `FilterBar.tsx`: phones and tablets: three sticky two-line summary cells. Publishes its height as `--filterbar-sticky` for sticky day headers; never feeds back into
  its own size.
- `FilterSheets.tsx`: the Where / When / What sheets, with live count and Clear in the footer.
- `FilterRail.tsx` + `RailPanel.tsx`: desktop: sticky off-white rail of collapsible panels.
- `useSummaries.ts`: two-line summaries plus filter names and titles.
- `clear.ts`: "Clear" for one filter, its Undo label, and whether a filter has nothing picked
  (greys out "Show").
- `where/`, `when/`, `what/`: the three panels.
