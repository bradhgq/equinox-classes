# filters/

- `types.ts`: the `Filters` model (explicit selection: ticked = shown), tri-state helper, list
  helpers.
- `where.ts`: ticked clubs; group / city All states; area popover decisions; toggles.
- `when.ts`: day toggles, per-day ranges, "new day copies the last touched day", shortcuts.
- `what.ts`: whole categories + individually ticked families; "any class" default; toggles.
- `match.ts`: does a class pass When and What.
- `codec.ts`: Filters ↔ the short share-link / cookie query string.
- `summary.ts`: filter-bar summaries and the one-sentence share text.
- `filters.test.ts`: tests for all of the above.
