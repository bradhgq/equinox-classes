# apis/

- `equinox.ts`: the client (`EquinoxClient`: facilities, classes, catalog, class detail) with
  throttling and retries, plus reference data (categories, time zones, `timeOfDays` values).
- `types.ts`: raw response shapes, trimmed to the fields we use.

A small typed client for Equinox's **public, unauthenticated web API**: the same
endpoints equinox.com's club and class pages call. The downloader uses it; the web app never
calls Equinox directly (see [CORS](#limits-and-etiquette)).

Nothing here is documented by Equinox. Everything below was found by reading equinox.com's own
JavaScript and probing the endpoints on **2026-10-04**. Treat it as observed behavior that can
change without notice.

```ts
import { EquinoxClient } from "./equinox.ts";
const eqx = new EquinoxClient();
const classes = await eqx.classes({ facilityIds: [112], startDate: "2026-10-04", endDate: "2026-10-11" });
```

## Endpoints

Base: `https://api.production.equinox.com`. All JSON. No auth, cookies or API key needed for the
ones marked **public**.

| | Method + path | What it returns |
|---|---|---|
| **public** | `GET /v6/facilities/` | Every club (~144, 121 `status: "Open"`), with region, time zone, address, coordinates. ~1.4 MB. |
| **public** | `GET /v6/facilities/facility/{facilityId}` | One club, same shape. |
| **public** | `GET /v6.1/facilities?ids=112,138` | Lighter club records by id. |
| **public** | `GET /v6/facilities/region/facility?regionName=New%20York&source=Web` | One region's clubs grouped by sub-region (Uptown, Midtown, ...). |
| **public** | `POST /v6/facilities/nearbyclub` `{latitude, longitude, numberFacilities, radius}` | Facility ids near a point (used by the club finder). |
| **public** | `POST /v6/groupfitness/classes/allclasses` | **The schedule.** See [class search](#class-search). |
| **public** | `GET /v6/groupfitness/classes/{classInstanceId}` | One class occurrence plus `description` and `benefits` ratings (strength/cardio/flexibility/regeneration, 1–3). |
| **public** | `GET /v6/groupfitness/classes?categoryIds=104,6` | Class *templates* per category with `totalReservations` (lifetime bookings, a decent popularity signal). `categoryIds` is required (500 without it). |
| **public** | `GET /v6/groupfitness/classes/instructors/?instructorIds=12474` | Instructor records and headshot URLs. |
| member | `GET /v6/groupfitness/regions` | 401 without a member token. |
| member | `POST /v6/groupfitness/reservation` | **Books a class.** Needs the member's `Authorization` token. |
| member | `PUT /v6/groupfitness/reservation/{id}` | Cancels a booking. |
| member | `GET /v6/groupfitness/reservations?startDateTime=…&endDateTime=…` | The member's bookings. |

The member endpoints are listed for completeness only. Booking on someone's behalf would mean
handling their Equinox credentials, so this project deliberately doesn't (see
[Booking](#booking-deep-links-and-the-app)).

## Class search

`POST /v6/groupfitness/classes/allclasses`

```json
{
  "startDate": "2026-10-04",
  "endDate": "2026-10-11",
  "facilityIds": [112, 138],
  "isBookingRequired": false
}
```

| Field | Behavior |
|---|---|
| `startDate` | Club-local date, inclusive. |
| `endDate` | Club-local date, **exclusive**. `2026-10-10`→`2026-10-10` returns nothing; `2026-10-10`→`2026-10-11` returns the 10th. |
| `facilityIds` | Integers (strings also accepted). **Use one club per request.** Multi-club requests silently drop classes once the result passes about 1,400. For example, 5 clubs expected to return 2,406 classes returned 1,472, and a repeat returned a *different* 1,472. One club over 365 days was complete. See `downloader/README.md`. |
| `workoutCategoryIds` | Filters by category, e.g. `[104]` for Yoga. ✅ |
| `instructorIds` | Filters by instructor id. ✅ |
| `classIds` | Filters by class template id (e.g. every "Stronger"). ✅ |
| `timeOfDays` | Integers: `0` = Morning, `2` = Afternoon, `1` = Evening (note the order). Strings like `"Morning"` → HTTP 400. ✅ |
| `isBookingRequired` | No observable effect. |
| `categoryIds` | Ignored here (it's the catalog endpoint's parameter). |

There is **no** server-side filter for time ranges, weekdays or class-name text. Do those
client-side; it's cheap once the data is local.

Response: `{ "messages": null, "classes": [...] }`. `classes` is `null` (not `[]`) when nothing
matches. Errors come back as HTTP 400 with
`{"messages":[{"messageID":1014,"errorMessage":"CLASS_SEARCH_FAILED"}]}`.

Useful fields per class:

- `classInstanceId`: this occurrence; `classId`: the template ("Vinyasa Yoga" everywhere).
- `startLocal` / `endLocal`: club-local wall time (`2026-10-04T08:45:00`). `startDate` / `endDate`: UTC.
- `name`, `workoutCategoryId`, `studioName`, `classLevel.content`, `timeSlot` (Morning/Afternoon/Evening).
- `instructors[0].instructor` and `instructors[0].substitute`: when a sub is covering, both are set.
- `label`: `{name: "New" | "Updated"}` or null. `status.isCancelled`.
- `status.*` reservation fields (`reservationStartDate`, `reservableItemsLeft`, `isClassFull`, …):
  **always null or false when unauthenticated**. There's no public view of capacity or waitlists.

## Reference data

**Categories** (`workoutCategoryId` → name, from equinox.com's own class search page):

| id | name | id | name |
|---|---|---|---|
| 6 | Cycling | 4 | Barre |
| 104 | Yoga | 2 | Boxing |
| 105 | Pilates | 106 | Dance |
| 213 | Strength | 202 | Running |
| 212 | Sculpt | 203 | Swim |
| 5 | HIIT | 210 | Regeneration |
| | | 214 | Outdoor Fitness |

**Time zones**: facilities report Windows names. Only four are in use: Eastern (69 clubs),
Pacific (39), Central (9) and GMT Standard Time (4, London). `ianaTimeZone()` maps them.

**Regions**: `region` is `"Area/SubArea"` (`"New York/Downtown"`, `"Southern California/The Valley"`,
`"Canada/Toronto"`) or a single name (`"Boston"`, `"Florida"`, `"London"`).

**Schedule horizon**: how far ahead classes are published is covered in
[`../downloader/README.md`](../downloader/README.md).

## Booking, deep links and the app

- **Class page (works):** `https://www.equinox.com/groupfitness/classes/{classInstanceId}` is a
  public page with date, time, studio, instructor and description. `/groupfitness/{id}`
  redirects there. Members sign in to equinox.com to book. This is the link our web app uses
  for "Book".
- **The app:** "Equinox+" on iOS (App Store id `318815572`, bundle `com.equinoxfitness.Equinox`)
  and Android (`com.equinoxfitness.equinox`).
- **Opening the app (checked 2026-10-05 from a link the app shares):**
  - The app's share links are Branch.io short links such as `https://m.equinoxplus.com/EUmnhB9GWlb`.
    That redirects to `https://equinoxplus.app.link/…`, which the app owns.
  - **Universal links:** `m.equinoxplus.com` and `equinoxplus.app.link` serve an
    `apple-app-site-association` for `55RJNWAZWA.com.equinoxfitness.Equinox` that claims **every
    path** except `/e/*` and links with `$web_only=true`. `www.equinox.com` has none (404), so the
    class-page link above always opens in the browser.
  - **Android** resolves the same link to
    `intent://open?…#Intent;scheme=eqxplusmobile;package=com.equinoxfitness.equinox;…`, so the
    app's URL scheme is `eqxplusmobile://`, and Branch passes only a click id.
  - **Which class a share link opens lives in Branch's link data.** The app fetches it after
    opening. Desktop browsers land on `www.equinoxplus.com`; phones without the app get the App
    Store. The app makes these links through Branch's API (`channel: API`).
  - **The data is readable:** for link-preview crawlers (iMessage's
    `facebookexternalhit/1.1 Facebot Twitterbot/1.0` agent), Branch puts the whole link data,
    base64 JSON, in the `al:ios:url` meta tag's `link_click_id=link-<id>-<data>`. For the example
    (checked 2026-10-05):
    - `path: "classes"` and `classid: base64("class:5kdj8UPNPZDuMMfUiUykqH")`, a type-prefixed
      content id;
    - `$og_title: "Pilates Mat: Low Impact Work"`, an Equinox+ on-demand video, not a club class.
    So the app routes on custom keys (`path` names the screen), not on the URL path.
  - **Self-built links don't work (tested on an iPhone with the app, 2026-10-05).** Branch accepts
    query parameters on the bare domain as link data (`https://m.equinoxplus.com/?$desktop_url=…`
    redirects there). But a rebuilt `?path=classes&classid=<same id>` link did not open the class
    that the original short link opens, and three guesses for a club class opened nothing.
  - **Club classes can't be shared from the app** (no share button), so there's no club-class link
    to decode. The next lead is the app's own traffic: what it requests when it opens a club class,
    and the deep links inside its push notifications or notification inbox.
  - **What we do today:** `https://m.equinoxplus.com/` opens the app on a phone that has it,
    landing on its home screen, and goes to the App Store otherwise. That's `EQUINOX_APP_URL` in
    `shared/links.ts`; the class detail offers it on phones.
  - **The class page has no booking for a signed-out visitor:** on a phone,
    `www.equinox.com/groupfitness/classes/{id}` shows details and marketing only, with no Book button
    and no app link.
  - Other dead ends: `equinox.com` and `equinoxplus.com` have no `apple-app-site-association`;
    `link.equinox.com` is a login page; `equinox.onelink.me` serves an empty applinks list.
- **Booking rules** ([equinox.com/bookingrules](https://www.equinox.com/bookingrules)):
  - Booking opens **26 hours before class start**.
  - Booking is closed **2:00–5:00 AM club-local** every day, so an opening that would land in that
    window happens at 5:00 AM instead. `shared/booking.ts` implements this.
  - Cancel at least 90 minutes before class.
  - Three late-cancels or no-shows in 30 days shrink the window to 90 minutes for a week.
  - Fully booked classes have one waitlist.

## Limits and etiquette

- **Rate limits:** none advertised. No `X-RateLimit-*` or `Retry-After` headers. 30 sequential and
  20 concurrent requests all returned 200, in ~0.2 s and ~1.6 s respectively. We didn't push
  harder and shouldn't. The infrastructure looks like AWS (`X-Amz-*` allowed headers), which
  usually means a WAF that can block abusive clients without warning.
- **Client defaults:** at most 2 requests in flight, at least 250 ms between request starts, and
  exponential backoff with jitter on 429 / 5xx / network errors (honoring `Retry-After` if it ever
  appears). One full download is on the order of a hundred requests, a few times a day. Keep it
  that way.
- **CORS:** preflight requests from other origins get `403`, so browsers on our domain can't call
  the API. Fetching is server-side by design.
- **Caching:** every response sends `cache-control: no-cache`. The downloader's raw cache is our
  only cache.
- **Identification:** the client sends `User-Agent: equinox-classes/0.1 (personal schedule viewer)`
  rather than impersonating a browser.
