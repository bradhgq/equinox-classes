# results/

- `Results.tsx`: picks the state: first run, nothing picked, loading, errors, no matches, or the
  agenda.
- `Agenda.tsx`: day groups with week dividers, rendered in chunks as you scroll.
- `DayGroup.tsx`: sticky day heading, "schedule published through" notes, then rows.
- `ClassRow.tsx`: one class. The whole row opens the detail; a chevron, never an external arrow.
- `MetaLine.tsx`: result count (live region); a stale-data warning only when needed.
- `NarrowHint.tsx`: "Narrow it down" nudge toward When and What.
- `NoMatches.tsx`: one-tap fixes with counts, plus where the class does run.
- `ClubLoadError.tsx`: one club's file failed: retry inline.
- `LoadError.tsx`: the index itself failed.
- `useSkeletonHold.ts`: on a cold load, keeps the skeleton up until every club lands (max 1 s), so
  rows don't trickle in.
