# equinox-classes

An unofficial schedule finder for Equinox group-fitness classes. Pick clubs, days and times, and
class types, and get one list of everything Equinox has published, with a link to book each class
on equinox.com. Equinox publishes through the end of the week three weeks out, so that's 21–27
days ahead depending on the weekday.

- **No database.** A downloader polls Equinox's public API every 12 h, archives each poll and
  writes static JSON.
- **Static front end.** It filters client-side and remembers your filters in a cookie.
  Share links are short query strings.
- **Unofficial.** Not affiliated with Equinox. Open fonts and our own monogram; no Equinox
  branding.

## Folders

- `apis/`: Equinox API client and API notes (endpoints, filters, limits, booking rules).
- `shared/`: data contract, booking-window and class-family logic shared by the downloader and
  the web app.
- `downloader/`: polls the API, archives raw snapshots, builds `data/`.
- `web/`: front end (Preact + Vite).
- `deploy/`: running it on a server (12 h timer + static serving).
- `docs/`: design spec, critiques, handoff, notifications proposal.

## Quick start

```sh
npm install && npm run download        # Node 24+; writes data/
cd web && npm install && npm run dev   # http://localhost:5173
```

See `CLAUDE.md` for conventions.
