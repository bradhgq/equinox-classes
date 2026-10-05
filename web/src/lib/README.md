# lib/

Pure logic, no DOM (except `download.ts`). Covered by `node --test` in `*.test.ts`.

- `catalog.ts`: lookups over `index.json`; club groups (area, or whole city).
- `filters/`: filter model, Where/When/What rules, matching, URL codec, summaries.
- `clubSearch.ts`: club search: word starts, name matches first, the town when it explains a
  match, shorthand (NYC, LA, SF, DC, OC), and clubs that match but have no classes.
- `results.ts`: loaded schedules + filters → agenda days; per-family counts; instructor text; row focus keys.
- `ranges.ts`: time ranges: presets, the "+" rule, select options.
- `time.ts`: club-local date/time parsing and formatting.
- `booking.ts`: booking status, row tag and sentences (rule in `shared/booking.ts`).
- `ics.ts`: calendar text: one event (.ics file, Google link) or a whole subscribable calendar.
- `reminder.ts`: "Remind me to book": a 15-minute event, with an alert, when booking opens.
- `feed.ts`: a search as a calendar feed: the page's own matches at their real times (server renders it).
- `cookie.ts`: read and serialize the `eqxc` cookie.
- `download.ts`: browser file download; Apple-platform check.
- `test-fixture.ts`: a tiny index for tests.
