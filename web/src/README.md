# web/src/

- `main.tsx`: loads fonts and global styles, clears the static shell, mounts the app.
- `App.tsx`: loads the index, then lays out header, filters (rail or bar + sheets), results,
  detail and toasts.
- `components/`: generic, reusable UI pieces (Button, Chip, Sheet, Popover, …). They know nothing
  about classes.
- `features/`: app-specific UI built from components: filters, results, class detail, share,
  first run.
- `lib/`: pure logic, unit-tested with `node --test`: filters, URL codec, time, booking, calendar
  files.
- `state/`: React-style contexts for filters (with cookie and shared-link persistence) and
  derived results.
- `data/`: fetching `index.json` and club files, with caching and a concurrency limit.
- `hooks/`: small browser hooks (breakpoint, clock, on-screen keyboard).
- `styles/`: design tokens, base element styles, self-hosted fonts.
