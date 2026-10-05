# shared/

Code used by both the downloader (Node) and the web app (browser). Keep it dependency-free and
environment-neutral.

- `schema.ts`: the JSON data contract (`DataIndex`, `ClubSchedule`, `ClassItem`, …). It's the
  only place it's defined.
- `families.ts`: class name → family rules for the class filter. Folds one-off titles like "THEME
  RIDE: …" into their prefix.
- `booking.ts`: when booking opens for a class (26 h before; Equinox closes booking 2–5 AM local).
- `links.ts`: links into Equinox: a class's page, the booking rules, and the app.
- `*.test.ts`: unit tests (`npm test` at the repo root).
