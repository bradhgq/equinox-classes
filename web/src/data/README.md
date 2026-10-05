# data/

- `api.ts`: fetches `index.json` and club files; turns failures into plain-language messages.
- `useIndex.ts`: loads the index once → catalog; loading / ready / error with retry.
- `useSchedules.ts`: loads the chosen clubs' files: module cache, at most 6 requests at a time,
  stable arrays between renders, per-club failures with retry.
