# downloader/

Polls Equinox's public API, archives every poll as an immutable raw snapshot, and builds the
static JSON the web app reads (`shared/schema.ts`). Runs unattended on a 12-hour timer.

- `download.ts`: CLI entry (`npm run download`); runs fetch then build, prints a summary, sets the exit code.
- `fetch.ts`: stage 1, API → new snapshot folder (one request per open club, manifest written last).
- `build.ts`: stage 2, newest complete snapshot → `index.json`, `clubs/<id>.json`, reports; drop check.
- `snapshots.ts`: snapshot layout, manifest type, listing, per-club fallback to older snapshots.
- `transform.ts`: pure raw → schema mapping (cities/areas/clubs, `ClassItem`, families, categories).
- `report.ts`: class-name prefix analysis (`reports/class-names.{json,md}`), for curating `shared/families.ts`.
- `sanity.ts`: publish/refuse decision when the class count collapses.
- `dates.ts`, `io.ts`: club-local date helpers; atomic (temp + fsync + rename) and gzip file I/O.
- `testing.ts`: fixtures for the tests. `*.test.ts`: unit tests, no network (`npm test`).

## Usage

```sh
npm run download                          # fetch a snapshot, build data/
npm run download -- --build-only          # rebuild from the newest complete snapshot (no API)
npm run download -- --snapshot 2026-10-04T23-56-24Z   # rebuild from a specific snapshot
npm run download -- --clubs 112,138       # fetch only these clubs; others come from older snapshots
npm run download -- --fetch-only          # archive a snapshot, leave published output alone
npm run download -- --help
```

Other options: `--out <dir>` (default `<repo>/data`), `--raw <dir>` (default `<out>/raw`), `--days <n>`
(default 42), `--force` (publish despite the drop check).

Exit codes: `0` ok · `1` error (e.g. API down and no earlier snapshot) · `2` bad usage · `3` more than
10% of clubs failed to fetch (output still built; those clubs come from older snapshots) · `4` publish
refused by the drop check (old output kept).

## Outputs

```
data/
  index.json                 DataIndex      published (serve statically)
  clubs/<facilityId>.json    ClubSchedule   published
  reports/class-names.json   prefix/variant analysis + every distinct class name (not for the web app)
  reports/class-names.md     one-table summary of the same
  raw/<snapshot>/            raw archive, one folder per poll (don't serve it)
    facilities.json.gz       GET /v6/facilities/ response body
    classes/<id>.json.gz     POST allclasses response body for one club
    classes/<id>.<start>.json.gz   one per request, only if a club's range had to be split
    manifest.json            written LAST: run times, requests, bytes, per-club result, horizon
```

- **Snapshot names** are the run's UTC start, `2026-10-04T23-56-24Z` (sorts chronologically).
- **Responses are stored as returned**: the client's parsed response object, re-serialized and gzipped
  (level 9). Re-serializing reproduced the body byte-for-byte for all 32 responses we compared.
- **A folder without `manifest.json` is incomplete** (the run died) and is ignored by builds and
  fallbacks. Nothing ever deletes snapshots, complete or not.
- **Fallback**: the build takes each open club from the newest complete snapshot (up to the one being
  built) whose fetch of that club succeeded. Fetch records that snapshot as `clubs.<id>.fallback`
  for failed clubs; build prints `fallback: <id> <name> <- <snapshot>`. The same rule lets a `--clubs`
  run refresh a few clubs and still publish all of them.
- **Times**: `DataIndex.generatedAt` is the built snapshot's `startedAt`; each `ClubSchedule.generatedAt`
  is the start of the snapshot its data came from (older for fallback clubs). Builds are therefore
  deterministic: rebuilding the same snapshot gives byte-identical files.
- **Size**: ~10 MB per poll (gzipped), ~7 GB a year at 2 polls/day; see [Request budget](#request-budget-and-archive-growth).

## Methodology

**Fetch.** `GET /v6/facilities/` gives the clubs; `status === "Open"` (121). For each open club, one
`POST /v6/groupfitness/classes/allclasses` for `[today, today + 42)` in the club's own zone (Windows
zone → IANA via `ianaTimeZone()`; London rolls to the next day five hours before New York). Requests
go through `apis/equinox.ts`: at most 2 in flight, ≥250 ms between starts, 4 retries with backoff.

- *One club per request*, because multi-club requests silently drop classes (see quirks). The busiest
  club (West 76th Street) returns 682 classes. If a response ever reaches 1,000 classes, that range is
  re-fetched as two halves (recursively).
- *42 days*, because the published horizon is at most 28 days including today (below) and days past it
  come back empty, costing nothing. The summary warns if any club has classes on the last requested
  day, i.e. if Equinox ever publishes further out.
- *Start today, not yesterday*: the API returns all of today (finished classes too); the app is
  forward-looking and hides past classes by clock. Yesterday would add ~4% for nothing.
- *Facilities fallback*: if that request fails, or the list lost more than half its open clubs, the run
  uses the previous snapshot's list (still saving what it got) and says so in `manifest.facilities.note`.

**Build** (pure; `transform.ts`):

- City: `region` "X/Y" → X, except X ∈ {Canada, Washington, Pennsylvania} → Y (Toronto, Vancouver,
  Seattle, Philadelphia). No region → the address city.
- Area: the official `subRegion` ("Downtown", "The Valley"), slug `slugify("<city> <area>")`. Cities
  whose name came from Y have no areas. `Club.town` = `facilityContact.city`.
- Order: cities by club count (ties by name); areas by club count, then name; clubs by name
  (number-aware: "East 43rd" before "East 53rd"); area-less clubs last.
- Club: `name` = webName (or name without "Equinox "); `slug` = slugify(name), asserted unique (the
  build fails rather than publish colliding share links); `shortName` = shortName with a leading
  "Equinox " removed (4 clubs have "Equinox King West"-style short names), else name.
- `ClassItem`: the API's own field names and formats; `startLocal`/`endLocal`/`startDate` verbatim;
  name, studio, level and person names whitespace-trimmed; `instructor`/`substitute` as "First Last".
  Co-taught classes (123 of 43,804) list both instructors as "A & B", sorted, because the API's order
  flips between occurrences. `isCancelled`/`label` only when set ("Special_Event" labels are dropped).
  Deduped by `classInstanceId`, sorted by `startLocal`, name.
- `descriptions`: per classId, the most common trimmed `classDescription`.
- Categories: `CATEGORIES` order, only those present; an unknown id becomes "Other" (slug
  `other-<id>`) with a warning. Families: grouped by `familyOf(name).key`, as the schema describes.

**Publish.** If the new total is less than half the published `index.json` total (or zero), nothing is
written and the run exits 4; `--force` overrides. Otherwise club files are written first and
`index.json` last, each atomically, then club files for clubs no longer listed are removed.

## Horizon findings

Question: "the next 3 weeks? strictly 21 days, or 3 weeks with a cutoff?" Observed from **Sun 2026-10-04
23:10 UTC to Mon 00:01 UTC** (19:10–20:01 EDT; already Monday in London).

**Answer: a hard cutoff at the end of a Sunday–Saturday week, not 21 days.** Every club's schedule
ended on **Saturday 2026-10-31**: the rest of the current week plus three full weeks, 27 days past that
Sunday. The last week is complete, not a sparse tail. Whether the cutoff moves weekly or daily is not
settled yet (table below). If it's weekly, the visible horizon swings between 21 days (on Saturdays)
and 27 days (on Sundays).

Evidence:

- **Same cutoff everywhere.** 16 probe clubs across NYC, LA, Chicago, London, Toronto, Vancouver, Sports
  Clubs and E clubs, then the full run: 113 clubs end Sat 10-31; the other 4 with classes are
  weekday-only clubs (Mon–Fri service hours: Rockefeller Center, East 43rd, East 53rd, Pine Street)
  ending Fri 10-30. London ended on 10-31 too although it was already Monday 10-05 there.
- **Sharp edge, complete last week.** All clubs, classes per Sunday–Saturday week: 10,899 · 10,900 ·
  11,028 · **10,977** (Oct 25–31), then 0. Per club, last-week ÷ previous-week ranged 0.97–1.05 (median
  1.00). Sat 10-31: 1,270 classes vs 1,257 / 1,335 / 1,271 on the previous Saturdays.
- **The cutoff is applied at query time.** Classes beyond it already exist: `GET /v6/groupfitness/classes/12338000`
  is "Tai Chi", Sports Club LA, **2026-11-10**; every ID sampled in 12337990–12338050 is a Sports Club LA
  class on Nov 3–25. `allclasses` for that club and 2026-11-10 returns nothing.
- **Schedules are generated in monthly blocks.** Greenwich Ave's October classes have IDs
  12292655–12293249 covering Oct 1–31, each weekly slot getting 4–5 consecutive IDs; September's block is
  12226543–12227103 (Labor Day weekend regenerated separately). So generation is monthly, visibility is
  weekly-or-rolling, and the two are independent.
- **The past is a rolling window.** Requests reaching back months return classes from **Fri 2026-09-04**
  (today − 30 days, not week-aligned) onward, London included.
- **No change at midnight UTC.** Probing every 10 minutes from 23:19 UTC, and at 00:00:36 UTC Monday,
  the cutoff stayed at 10-31 and the past bound at 09-04 (so the rule isn't keyed to UTC days). Midnight
  Eastern (04:00 UTC) was not observed.

What one Sunday can't settle: "Sun–Sat week + 3 weeks", "today + 27 days" and "end of month" all give
10-31 on Sun 10-04. Two observations will decide it, and every manifest records `horizon.lastDates`:

| If the cutoff… | then the rule is |
|---|---|
| reaches Sun 11-01 on Mon 10-05 (after the server's midnight) | rolling, today + 27 days |
| stays 10-31 until Sun 10-11, then jumps to Sat 11-07 | weekly: current week + 3 |
| stays 10-31 until Nov 1, then jumps to Nov 30 | end of month |

```sh
for m in data/raw/*/manifest.json; do jq -c '[.snapshot, .horizon.end, .horizon.lastDates]' "$m"; done
```

The downloader doesn't depend on the answer: 42 days covers all three.

## API quirks found while downloading

- **Multi-club requests silently truncate.** 5 clubs (expected 2,406 classes) returned 1,472: three
  clubs complete, one 87 of 488, one 0 of 533. Repeating it returned 1,472 again but 51 different IDs.
  3 clubs (expected 1,559) returned 1,441. 5 small clubs (1,245) were complete and identical to
  per-club results. No error or flag in any case. (`apis/README.md` says multi-club requests "work";
  they do only below ~1,400 classes.)
- **Single-club requests are complete and deterministic**: 1,237 classes for one club over 58 days
  equalled its two halves (632 + 605); repeated requests returned identical ID sets.
- **No range limit.** 61-day and 365-day windows return the same 533 classes as 28 days; past + future
  (Aug 1 → Dec 31) returned exactly past + future (522 + 533).
- **Lenient errors.** Reversed or empty ranges, unknown or closed facility ids, `facilityIds: []` and
  unpadded dates all return HTTP 200 with `classes: null`. We never triggered `CLASS_SEARCH_FAILED`.
- **Class responses are not compressed** (even with `Accept-Encoding: gzip`; the facilities GET is):
  ~2.9 KB per class, ~1.5 MB per club, ~1 s to first byte. They gzip ~11x, brotli ~65x.
- **The facilities response is cached upstream**: its `currentDateTime` read 11:30 EDT at 19:09 EDT.
- **Volatile fields**: `isFinished`, `isHappeningNow`, `facilityCurrentDateTime` change per request, so
  consecutive snapshots differ even when the schedule doesn't.
- **Cancellations**: `status.isCancelled` was false for all 43,804 classes. Cancelled classes may simply
  disappear; compare consecutive snapshots to find out.
- **Labels**: `Updated` 2,805, `New` 1,012, and `Special_Event` 182 (intro sessions, "35 Years Alive",
  holidays), which the schema doesn't carry. `classVariantType`: `Heated` 3,041, `Outdoor` 105.
- **People**: 2,431 classes show a substitute; 123 have two instructor slots (order varies); some last
  names are `""` or `" "` ("Moedizzy", "CJ").
- **Names**: trailing spaces ("Headstrong Reset Meditation "), an empty theme title ("THEME RIDE: ", 24
  classes at 7 clubs), ® marks, and one club prefixing its own classes ("W76th: Hot Vinyasa Yoga", 17
  names at West 76th Street). classId ↔ name is 1:1 (340 templates), one description each.
- **Time zones**: `startLocal` and `startDate` agree for every class, including London's switch from
  BST to GMT on Oct 25 (offset +1 → 0). The per-class `localTimeZone` field says "GMT" even in summer;
  ignore it. Toronto/Vancouver report Eastern/Pacific, i.e. America/New_York and America/Los_Angeles
  (same rules). No class crosses midnight; starts range 05:00–20:59.
- **Holidays**: Canadian Thanksgiving (Mon Oct 12) shows as a thinner week at Toronto/Vancouver (73 vs 81,
  142 vs 154) and a Vancouver "THANKSGIVING HOLIDAY HOURS" entry in `holidays`.
- **Clubs without classes**: 4 open clubs return none (Shoreditch, Pacific Palisades, E San Francisco,
  Hamptons). Shoreditch and Pacific Palisades also list no service hours. They're in the index with
  `classCount: 0`. Shoreditch has `clubType: null`.
- **IDs**: `classInstanceId` is global (no duplicates within or across clubs). `classDetail` reports
  club 112 as facility `"014"`, a different id scheme from allclasses.

## Request budget and archive growth

Measured on the 2026-10-04T23-56-24Z poll: **122 requests** (1 facilities + 121 clubs), 0 retries,
47 s fetching, 54 s including the build. A `--build-only` takes ~7 s. Peak RSS ~400 MB (V8 collects
lazily; the live data is much smaller).

| | per poll | per day (2 polls) | per month | per year |
|---|---|---|---|---|
| received from the API (uncompressed JSON) | 123.7 MB | 247 MB | 7.5 GB | 90 GB |
| stored in `raw/` (gzip -9, + 63 KB manifest) | 10.0 MB | 20 MB | 0.6 GB | 7.2 GB |

(Binary units, as the summary prints them; the manifest has exact bytes: 129,733,551 received,
10,450,268 stored. Size scales with the number of published classes, 43,804 here.)

Published output: `index.json` 77 KB, `clubs/` 15.0 MB for 121 files, largest `121.json` (West 76th
Street, 682 classes) 243 KB. The web server should gzip them (~10x).

## Recommended cadence

**Every 12 hours** (the deployment's plan) is enough for a schedule-discovery site:

- The base schedule is generated a month at a time and the visible horizon moves weekly (or daily), so a
  12-hour poll picks up each new week or day within half a day.
- Between polls, what changes is mostly substitutes. In the 23:56 poll, the share of classes showing a sub
  rises as the date nears: 2.5% at 22–27 days out, 3.8% at 15–21, 5.7% at 8–14, ~10% within a week, 11.9%
  today/tomorrow. That's roughly 170 newly posted subs a day across 121 clubs (~0.4% of the schedule).
  A 12-hour poll shows each within 12 h (6 h on average); only same-day, last-minute ones can be missed.
  No class was flagged cancelled, and none appeared or vanished between the 23:35 and 23:56 runs (the
  only differences were 67 co-instructor order flips, which the build normalizes).
- Booking happens on equinox.com: our "Book" link opens the live class page with the current
  instructor, so a stale sub costs a surprise, not a booking.
- Two polls keep the load to ~250 requests and ~250 MB a day.

Suggested times: ~04:30 and ~16:30 America/New_York. The morning poll lands after midnight Pacific
(every US club has rolled to the new day) and before the first classes at 05:00; the afternoon one
refreshes the next day as people plan it. **Optional third poll around 11:00 ET** (+50% load) catches
same-day subs for the busy evening classes. If the horizon turns out to be weekly, Sunday's morning
poll is the one that picks up the new week.

## Failure behaviour

- **A club's fetch fails** (after the client's retries): logged, recorded in the manifest with the
  fallback snapshot, run continues; the build uses that club's newest earlier good data. Exit 3 if more
  than 10% of clubs failed.
- **Facilities request fails**: uses the previous snapshot's list. With no earlier snapshot the run
  aborts (exit 1), leaving an incomplete snapshot folder.
- **The run dies midway**: no manifest, so the folder is ignored; published output is untouched until a
  build completes.
- **Class count collapses** (less than half, or zero): build refuses, keeps the published files, exit 4.
- **Duplicate club slug, or an unknown time zone in a facility**: the build fails (exit 1) or drops that
  club with a warning, respectively; Equinox renaming clubs is the likely cause.
- Every published file is replaced atomically, so readers never see partial JSON.

## Future refinements / open questions

- **Settle the horizon rule** from the manifests (table above). If it's weekly, consider a Sunday poll.
- **Cancellations**: diff consecutive snapshots for classes that vanish shortly before their start; if
  that's how Equinox cancels, the build could carry them as `isCancelled` for a while.
- **Schema ideas** (not changed; owner's call): `classVariantType` ("Heated", "Outdoor") is a useful
  filter; `label` could carry "Special_Event"; co-taught classes would be cleaner as
  `instructors: string[]`.
- **Families**: fold "W76th: X" into "X" in `shared/families.ts`; `reports/class-names.md` lists other
  candidates (THEME RIDE, Halloween, Thanksgiving, Intro to Equinox).
- **Fewer requests**: batching small clubs under a strict per-request budget (~1,000 classes) would cut
  requests 2–3x, but truncation is silent, so it would need verification; per-club is simpler and the
  bytes are the same.
- **Disk**: brotli stores the same responses ~6x smaller than gzip, if the archive ever matters.
- **Near-term refresh**: if subs need to be fresher than 12 h, add a mode that refetches only the next
  2–3 days and overlays them on the newest snapshot (~10% of a full poll).
