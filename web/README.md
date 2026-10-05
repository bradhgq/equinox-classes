# web/

The front end: Preact + TypeScript + Vite, CSS Modules, no UI library. It reads the
downloader's static JSON from `./data/`.

- `index.html`: the page, with link-preview (Open Graph) tags, icons, the manifest, and a static
  header + skeleton that paints before the JS loads (mirrors `Header` and `Skeleton`; keep in step).
- `vite.config.ts`: in dev it serves `../data` at `/data` and the calendar feed at `/calendar.ics`; builds use relative asset URLs (works
  under a sub-path).
- `public/`: copied as-is: icons, `og.png` link preview, `manifest.webmanifest`.
- `src/`: the app (see `src/README.md`).

```sh
npm run dev        # http://localhost:5173 (needs ../data from `npm run download` at the repo root)
npm test           # node --test over src/**/*.test.ts (pure logic)
npm run build      # typecheck + dist/
```

Design source of truth: `../docs/design/03-handoff.md`.
