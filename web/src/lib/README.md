# lib/

Pure logic, no DOM (except `download.ts`). Covered by `node --test` in `*.test.ts`.

- `catalog.ts`: lookups over `index.json`; club groups (area, or whole city).
- `filters/`: filter model, Where/When/What rules, matching, URL codec, summaries.
- `results.ts`: loaded schedules + filters → agenda days; per-family counts; instructor text; row focus keys.
- `ranges.ts`: time ranges: presets, the "+" rule, select options.
- `time.ts`: club-local date/time parsing and formatting.
- `booking.ts`: booking status, row tag and sentences (rule in `shared/booking.ts`).
- `ics.ts`: calendar reminder files and Google Calendar links.
- `cookie.ts`: read and serialize the `eqxc` cookie.
- `download.ts`: browser file download; Apple-platform check.
- `test-fixture.ts`: a tiny index for tests.
