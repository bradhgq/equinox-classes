# Notifications (v2): proposal

Status: v2a's calendar subscription is **built** (2026-10-04, see below); the rest is a proposal.

You asked for this to be thought through: saved searches that remind people on a schedule they
pick, plus "tell me when this class is bookable", delivered to phones if possible and email if
needed. Below is what people actually need, what each delivery channel can and can't do, a phased
plan, and the decisions only you can make.

## 1. What people want to be told

| # | Trigger | Example | Time-critical? | Feasible with our data? |
|---|---|---|---|---|
| A | **Booking opens** for a specific class | "Beats Ride, Wed 7:00 AM, opens now" | **Yes.** Popular classes fill within minutes of the 26 h mark. | Yes: `shared/booking.ts` computes the moment (26 h before; 2–5 AM closure → 5:00 AM). |
| B | **Scheduled digest** of a saved search | "Mon & Wed at 7:30 AM: today's yoga at Greenwich + Hudson Yards" | No. Planning aid. | Yes: run the same filter engine on the latest download. |
| C | **Booking opens for anything matching a saved search** | "Every time a class matching *Morning yoga* opens for booking" | Yes | Yes: A, applied to every match. Needs batching to avoid spam. |
| D | **Schedule changes** for things I care about | "Your Wed 7:00 Beats Ride now has a sub / was cancelled" | Somewhat | Partly: we diff downloads, so it's only as fresh as the refresh cadence. |
| E | **A spot opened** in a full class | "Someone dropped Wed Beats Ride" | Yes | **No.** Capacity and waitlist are null without a member login. Out of scope. |

A and B are what you described. C is the killer feature for popular classes. D is a nice later
add-on. E isn't possible without handling members' Equinox credentials, which we won't do.

## 2. Delivery channels: honest trade-offs

| Channel | Reaches phone? | Setup for the person | Timeliness | Our cost and complexity | Verdict |
|---|---|---|---|---|---|
| **Calendar alarm** (per-class `.ics` download) | Yes, via their calendar app | None | Exact (local alarm) | None (client-side) | **Ship in v1** (already in the design). Covers A with zero permissions. |
| **Calendar subscription** (`webcal://…/feed.ics?<search>`) | Yes | Tap "Subscribe" once | Alarms are exact, but the feed refreshes slowly: Apple 5 min–1 week (user-set), Google ~8–24 h | Tiny: a stateless server route | **v2a.** B/C-lite for free. The best value-per-effort here. |
| **Web Push** (PWA + service worker) | Android, desktop, macOS: yes. **iPhone: only after "Add to Home Screen"** (iOS 16.4+) | Allow notifications; iPhone users must install first | Seconds | Medium: backend, DB, VAPID keys, scheduler | **v2b.** The real "notification on my phone". |
| **Email** | Yes, but in the inbox | Enter and verify an address | Minutes; poor for A | Medium: provider (Postmark, Resend, SES), verification, unsubscribe, deliverability | v2c, only for digests (B). Optional. |
| **ntfy / Pushover / Telegram** | Yes, via their app | Install an app, paste a topic | Seconds | Small: one HTTP POST per message | Optional power-user channel. Great for a self-hoster (you). |

Key constraints to design around:

- **iOS Web Push needs a Home Screen install.** In mobile Safari the permission prompt doesn't
  exist until the site is added to the Home Screen and opened from there. The UI must detect this
  and teach it ("Share → Add to Home Screen") instead of offering a button that can't work.
- **Never prompt for permission on load.** Ask only after an explicit "Notify me" tap, with a
  one-line pre-prompt explaining exactly what they'll get ("A notification on this device when
  booking opens: Tue 5:00 AM"). A denied permission is nearly impossible for us to re-request, so
  the pre-prompt protects the one shot.
- **Booking-open alerts must be re-validated at send time.** Classes get cancelled, retimed or
  re-subbed between downloads. The sender re-reads the latest data, skips cancelled classes and
  reschedules if the start time moved.

## 3. Recommended plan

### v1 (in the current design): per-class "Add to calendar"

The `.ics` download has a `VALARM` at the booking-open moment (a relative trigger such as
`-PT25H45M`, so it survives every calendar app). It needs no server, no permissions and no
accounts. It also teaches the "booking opens 26 h before" rule.

### v2a: saved searches (client-only) + calendar subscription

1. **Saved searches as presets, with no server.** "Save search" → name it ("Weekday mornings").
   Presets live client-side next to the filters cookie and appear as one-tap switches above the
   results. They're useful on their own, and they're the object every later notification hangs
   off.
2. **"Subscribe in Calendar" per saved search.** The URL is the share-link query on a feed route:
   `webcal://host/feed.ics?club=greenwich-avenue&day=mo,we&time=6-9&cat=yoga`.
   - It's **stateless**: no database, no accounts. The query is the subscription.
   - The server renders matching classes for the next 3 weeks as events, each optionally with an
     alarm at booking-open.
   - A per-feed option `alarm=open|start|none` picks the alarm.
   - It costs about one route plus the filter engine shared with the web app.

**Built (2026-10-04): the calendar subscription, without presets yet.**

- **Entry point:** a "Subscribe" button beside the result count opens a sheet. It shows the search
  in words and the expected alerts per week, then Apple Calendar (`webcal://`), Google Calendar
  ("add by URL") and Copy link.
- **Feed:** `GET /calendar.ics?<share query>` (`deploy/calendar.ts`, built from `web/src/lib/feed.ts`).
  - It has one event per match **at the moment booking opens** (the same "Book: …" event as the
    one-off reminder), with an alert at its start.
  - Events sit at booking time, not class time, because the alert is the point: every calendar can
    alert "at the time of the event", while a feed's own alarms are dropped by Google and, when
    "Remove Alerts" is on, by Apple.
  - No `alarm=` option yet.
- **Guardrails:**
  - Over 25 alerts a week, the sheet suggests narrowing with When or What.
  - Over 300 classes, it won't offer the feed at all.
  - The server caps a feed at 300 events.
- **Still to do from v2a:** saved-search presets, then a per-preset subscribe.

### v2b: Web Push

**Entry points**

- Class detail: **Notify me when booking opens** (bell), next to Add to calendar.
- Saved search: a **Remind me** schedule:
  - Days, using the same S M T W T F S component as the When filter.
  - A time, using the same 30-minute time select.
  - What to send: "Today's / Tomorrow's / Next 7 days' matches".
  - An "Only if something matches" toggle.
  - An optional "Alert me when booking opens for matching classes" toggle (trigger C). These are
    batched per opening minute: "3 classes open for booking now".

**Identity:** anonymous and per device. A random device id cookie plus the push subscription. No
sign-up. Each device subscribes on its own. Cross-device sync can come later via an email magic
link if it's ever wanted.

**Architecture** (same repo, new `server/`):

```
server/            Node 24, zero or one deps (web-push for VAPID + aes128gcm encryption)
  api.ts           POST/DELETE /api/devices, /api/saved-searches, /api/alerts
  scheduler.ts     every minute: due digests + due booking-open alerts → send
  push.ts          web-push wrapper; 404/410 from push service → delete subscription
  db.ts            node:sqlite (built into Node 24)
shared/filter.ts   the same filter engine the web app uses (single source of truth)
web/sw.js          service worker: show notification; click → open class page or the app
```

Tables:

- `devices(id, push_subscription, tz, created_at, last_seen)`
- `saved_searches(id, device_id, name, query, created_at)`
- `schedules(id, saved_search_id, days_mask, time_local, tz, mode, only_if_matches, next_run_utc)`
- `class_alerts(id, device_id, club_id, class_instance_id, fire_at_utc, state)`
- `deliveries(…)` for idempotency and debugging.

**Behavior**

- *Booking-open payload:* "Booking open · Beats Ride 7:00 AM" with body "Wed · Greenwich Ave ·
  Erin Ay". Tapping goes straight to the equinox.com class page, with a "Book" action. Send it with
  `Urgency: high` and a TTL of about 15 min (a late "booking opened" is worse than none).
- *Digest payload:* "4 classes match Weekday mornings today". Tapping opens the app with that
  search applied.
- *Limits:* 20 saved searches and 50 pending class alerts per device. Rate-limit the API per IP.
- *Expiry:* alerts expire with their class, and the scheduler deletes dead subscriptions.

**Hosting:** one more systemd service next to the static site and the downloader timer. VAPID
keys live in sops. Resource use is negligible.

### v2c (optional): email digests

Only if friends without push want it. Use a transactional provider (Postmark or Resend) with
double opt-in, a one-click unsubscribe header and a weekly cap. Don't use email for booking-open
alerts.

## 4. Decisions for you

1. **Audience.** Just you, friends, or public? This drives abuse protection, whether email is
   worth it, and whether we need any identity at all.
2. **iPhone users.** Is "Add to Home Screen to get notifications" acceptable? It's the only
   web-native path to iPhone push.
3. **Self-hosted channel.** Should the server also support ntfy for you personally? It's trivial
   and very reliable.
4. **Email.** Skip it, or which provider?

My recommendation: build v2a next (presets + calendar subscription, a few days, no new
infrastructure), then v2b once the presets show which reminders people actually set.
