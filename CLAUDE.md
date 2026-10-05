# equinox-classes: working notes for agents

An unofficial, self-hosted Equinox class-schedule finder. A downloader polls Equinox's public
API every 12 h and writes static JSON. A static web app filters it client-side. There's no
database.

## Layout

- `apis/`: typed client for Equinox's public API, plus everything we know about the API (README).
- `shared/`: code used by both the downloader and the web app: data contract, booking rules,
  class families.
- `downloader/`: fetches snapshots and builds `data/` (raw archive + web JSON).
- `web/`: the Preact + Vite front end.
- `deploy/`: how the server runs it (timer, static serving).
- `docs/`: design docs, critiques, proposals.
- `data/`: generated output. Git-ignored; never commit it.

## Rules

- **Every folder has a brief `README.md`.** Use one-line bullets on what the folder and its files
  do. **When an edit adds, removes, renames or changes the purpose of a file, update that folder's
  README in the same change.** New folder, new README.
- **Readable over clever.** Small files, descriptive names, one component per file. Factor out
  anything reused, with no copy-paste variants. Comments explain *why*, not *what*.
- **One data contract.** `shared/schema.ts` is the only definition of the JSON shape. The
  downloader writes it, the web app reads it, and both import the types. Breaking change → bump
  `SCHEMA_VERSION`.
- **TypeScript runs natively in Node 24** (type stripping) for `apis/`, `shared/` and `downloader/`.
  Use erasable syntax only (no enums, namespaces or parameter properties) and `.ts` extensions in
  imports.
- **Zero runtime dependencies** outside `web/`. Prefer Node built-ins.
- **Be a polite API client.** Go through `apis/equinox.ts` (throttled, retrying). Never add
  request fan-out without checking the budget in `downloader/README.md`.
- **Unofficial.** Never use Equinox's logo or its licensed fonts (Equinox Sans, Messina Sans
  Mono). We ship open fonts (Inter, Inter Tight, DM Mono; SIL OFL) and our own "EC" monogram.

## Commands

```sh
npm run download          # fetch a snapshot + build data/ (root)
npm run download -- --build-only
npm test                  # node --test (apis, shared, downloader)
npm run typecheck
cd web && npm run dev     # front end at http://localhost:5173 (serves ../data)
cd web && npm run build && npm test
```
