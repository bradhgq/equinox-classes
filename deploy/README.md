# deploy/

How equinox-classes runs on a server. There's no database: a timer polls Equinox every 12 h and
a tiny Node server serves the built app plus the JSON.

- `server.ts`: a zero-dependency static server. It serves `web/dist` at `/` and the published
  JSON at `/data/`, re-issues the filter cookie (`/prefs`), serves calendar subscriptions
  (`/calendar.ics`), and exposes `/healthz`.
- `calendar.ts`: `/calendar.ics?<share query>`: a search as a calendar feed, one "Book: …" event
  when booking opens for each matching class. It runs the web app's own filter code
  (`web/src/lib`), so a subscription matches the page. `calendar.test.ts` covers it.
- `systemd/equinox-classes-download.{service,timer}`: polls at 04:30 and 16:30 New York time and
  rebuilds `data/`.
- `systemd/equinox-classes-web.service`: runs `server.ts` on `127.0.0.1:8080`, behind your
  reverse proxy or tunnel.

## Setup (any Linux with Node 24+)

```sh
# code
sudo git clone <repo> /srv/equinox-classes && cd /srv/equinox-classes
cd web && npm ci && npm run build && cd ..        # -> web/dist (the only build step)
# data dir + a first poll (about 1 minute, about 120 requests)
sudo useradd --system equinox-classes
sudo install -d -o equinox-classes /var/lib/equinox-classes
sudo -u equinox-classes node downloader/download.ts --out /var/lib/equinox-classes/data
# services
sudo cp deploy/systemd/* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now equinox-classes-download.timer equinox-classes-web.service
```

Point the proxy (Caddy, nginx, cloudflared, …) at `http://127.0.0.1:8080`. Forward
`X-Forwarded-Proto` and `X-Forwarded-Host`. The server uses them for the `Secure` cookie flag and
the absolute link-preview image URL.

Cron instead of systemd works too:

```
30 4,16 * * *  cd /srv/equinox-classes && node downloader/download.ts --out /var/lib/equinox-classes/data
```

## What lives where

| Path | Contents | Growth |
|---|---|---|
| `/var/lib/equinox-classes/data/raw/<UTC timestamp>/` | **Every poll, kept forever**: Equinox's raw responses as returned, gzipped, plus `manifest.json` | about 10 MB per poll → about 0.6 GB/month, 7 GB/year at 2 polls/day |
| `…/data/index.json`, `…/data/clubs/*.json` | The published JSON the app reads (`shared/schema.ts`) | replaced each poll (about 15 MB raw, about 2 MB gzipped on the wire) |
| `…/data/reports/` | Class-name analysis for curating `shared/families.ts` | replaced each poll |

The server publishes only `index.json` and `clubs/*.json`. The raw archive and reports are never
served.

## Calendar subscriptions

`webcal://<host>/calendar.ics?<the share-link query>`. Stateless: the query is the subscription,
so there's nothing to store and nothing to clean up.

- **Events:** one per matching class, 15 minutes long, at the moment booking opens (26 h before
  class; 5:00 AM when that lands in Equinox's 2–5 AM closure). Each has an alert at its start.
  Cancelled classes are left out; started ones drop off.
- **Limits:** at most 300 events per feed (the app won't offer bigger ones). Expect about 70 ms to
  render a fresh feed; repeat polls get a `304` via ETag.
- **Apps:**
  - Apple Calendar fetches it from the device and keeps its alerts unless "Remove Alerts" is on.
  - Google Calendar fetches it from Google's servers, so it needs a public HTTPS URL. It refreshes
    about once a day and uses the calendar's own notification settings, not the feed's alerts.
- **Proxy:** pass `/calendar.ics` through like any other path, query string included.

## Why these choices

- **12 h cadence:** most changes between polls are substitutes. See `downloader/README.md` for the
  numbers, and for an optional third poll around 11:00 ET.
- **`/prefs`:** Safari caps cookies set by JavaScript at 7 days. The app writes its filter cookie,
  then calls `/prefs`. The server echoes the cookie back with `Set-Cookie`, which makes it a normal
  400-day HTTP cookie. Without this server, for example on a plain static host, filters still work
  but expire after a week without visits.
- **Caching:**
  - `index.html` and `/data/*`: `no-cache` + ETag, so revisits are fast (304s) and never stale.
  - Hashed `/assets/*`: cached for a year.

## Checking it

```sh
curl -s localhost:8080/healthz                       # "ok" once data/index.json exists
journalctl -u equinox-classes-download -n 30         # last poll's summary line
ls /var/lib/equinox-classes/data/raw | tail -3       # newest snapshots
```

## NixOS

Deployment config belongs in the nix-config repo, under its own rules. This repo doesn't touch it.
A module needs:

- the two units above;
- a `systemd.tmpfiles` rule for `/var/lib/equinox-classes`;
- `nodejs_24` on the service path;
- a `virtualHosts` / tunnel entry pointing at `127.0.0.1:8080`.
