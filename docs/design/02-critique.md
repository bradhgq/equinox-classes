# equinox-classes: design critique (round 1)

Status: review of [`01-design.md`](01-design.md) and [`mock/`](mock/index.html) · 2026-10-04

Materials: the spec, frames f01–f09, the mock HTML, `apis/README.md`, `shared/schema.ts`,
`shared/booking.ts`, `shared/families.ts` and `docs/notifications-v2.md`. Method: the
design-critique framework (first impression, usability, hierarchy, consistency, accessibility),
plus a check against the owner's 10 requirements, edge cases, and whether the spec can be built
without guessing. Stress renders (320 and 360 px wide, 7 days × 2 ranges, desktop at 1024 px)
came from a scratch copy of the mock. The spec and mock were not edited.

## Summary

1. The base is strong: the agenda is the home screen, the Where/When/What bar reads as a sentence, the black-and-white styling is faithful to Equinox, and the per-day time model maps 1:1 onto one canonical format for links and the cookie.
2. **Critical:** the filter cookie is written from JavaScript, and Safari caps such cookies at 7 days. On iPhone, the main device, remembered filters would vanish about weekly. The server must set and refresh the cookie (C1).
3. **Trust:** opening a shared link silently replaces the recipient's saved search (Undo lasts one session), and Google Calendar ignores the "booking opens" alarm in the `.ics` file (H1, H5).
4. **Time picker:** the model is right but the default is wrong. Make "same times every day" the norm and per-day rows opt-in, add presets and undo, and fix the 320 px layout, where ✕ lands on "+" (H2, M2, M3, H6).
5. **Filters:** "empty means all" is invisible and turns tapping a second city into "add all its clubs". Both searches sit under blocks of chips, so about two results show with the keyboard up. 22 spec rules need a one-line decision before build (H3, H4, M9).

## Prioritized findings

| # | Severity | Where | Finding | Fix |
|---|---|---|---|---|
| C1 | Critical | §7 Cookie | The cookie is written from JS, and Safari caps those at 7 days, so iPhone users lose their filters about weekly | The server sets and refreshes `eqxc` with `Set-Cookie`; URL-encode the value |
| H1 | High | §7, §5.7, F05 | A shared link overwrites the recipient's saved search; the only backup is a session cookie | Treat a shared link as a temporary view until KEEP; first-time visitors keep it automatically |
| H2 | High | §5.4, F02 | Every day always gets its own row, so the common case (same times every day) is verbose; 7 days × 2 ranges = 14 chips | Add SAME EVERY DAY / PER DAY modes, matching `time=` and `su…sa=`; the copy rule applies only in per-day mode |
| H3 | High | §5.3, §5.5, F03, F04, F09 | "Empty = all" is invisible on chips and lists; tapping a second city adds all its clubs (and fetches their files) | Where: a city is a scope, with an explicit "All N clubs" row. What: an "All Yoga" row. Give narrowed chips a distinct state |
| H4 | High | F03, F04 | The searches sit below blocks of chips; with the keyboard up, about 2 rows (What) or 1 row (Where) are visible | A search mode that pins the field to the sheet top, collapses the chips and hides the footer while typing |
| H5 | High | §5.6, §9, F05 | Google Calendar ignores VALARM on `.ics` import, and Android handles `.ics` downloads poorly, so the v1 reminder fails silently | Put the event itself at the booking-open moment, alarm at start; add a Google Calendar link; define state rules |
| H6 | High | §8, F01, F02 | At 320 px the range ✕ lands on "+" and the When summary loses its times, failing WCAG 1.4.10 despite §8's claim | A narrow layout: day label above its ranges, full-width chip, no chevrons; restructure the bar |
| M1 | Medium | §5.2, §5.4, F01, F06 | Filter summaries wrap mid-phrase; "custom" says nothing; "Any club" contradicts §6 | Two deliberate lines per summary, plus rules for all 7 days, weekends, wrap-around and whole cities |
| M2 | Medium | §5.4, F02 | "+" is unpredictable (11 AM–2 PM after 6–9 AM); the 30-minute grid misses :15/:45 starts | Presets (Morning, Midday, Evening), a complementary default for the second range, 15-minute steps |
| M3 | Medium | §5.3–5.5, F02, F04 | Switching a day off discards its ranges; bulk actions and deselecting a chip destroy work; there's no undo | Restore within the sheet session; an Undo toast for bulk actions; define what the shortcuts do |
| M4 | Medium | §5.6, F01, F05, F09 | On mobile, booking is a bare ↗; the club is the smallest, faintest text; studio is redundant; booking status is hidden | A "BOOK ↗" button; club first in the sub line; a booking tag; a chevron to show rows expand; show the end time |
| M5 | Medium | §4, F09 | At 800 px the rail runs off-screen (What is invisible); a studio column; cramped at 1024 px; heavy BOOK outlines | A rail that scrolls and collapses; a booking-status column instead of studio; a lighter Book; move the toast |
| M6 | Medium | §3, §8, F01, F04–F06, F08 | `--fg-3` (3.36:1 light, 4.12:1 dark) carries text; mono labels are 9–10.5 px | Use `--fg-2` for all text; mono at least 11 px, information labels 12 px |
| M7 | Medium | §8 | The count's live region sits outside the modal (inert, so never announced); duplicate link names; cancellation shown only by strike-through | A live region inside each sheet; unique link names; a CANCELLED tag; fix the heading levels |
| M8 | Medium | §5.6, §6, schema, `booking.ts` | Clubs publish different horizons; DST (Oct 25 UK, Nov 1 US) may shift booking times; mixed time zones are undefined | Inline "published through" rows; a conservative alarm around DST; rules for time zones |
| M9 | Medium | Throughout | ~22 contradictions and gaps (started classes, `cat` semantics, shortcuts, equivalent states, …) | Make the one-line decisions in the M9 table |
| M10 | Medium | §5.3, §5.5, F03, F04, F09 | City chips push the club list below the fold; "+N" is undefined; selected items jump on tap; category order shifts | Collapse the city block; float selected items only when the sheet opens; fixed category order; city-level groups |
| M11 | Medium | §1 job 3, §5.1 | Sharing "the Saturday options" requires editing your own search; no way to share one class; Share scrolls away | A share preview that can narrow the days; "Share class"; keep Share reachable after scrolling |
| L1 | Low | F06, §5.7 | First run: Share is visible; nothing leads from Where to When and What | Hide Share; a "NEXT: WHEN →" flow or one tabbed filter sheet |
| L2 | Low | §2, §8, F02–F04, F09 | Tap targets below the spec's own 44 px (chips 40, shortcut links ~12 px tall, helper 32, ✕ 38) | Size them up, or restate the principle (44 px primary, 24 px secondary) |
| L3 | Low | F01, F05, F09 | "THIS WEEK" outweighs the content; weak count on mobile; mono used for sentences; facts repeat the studio | Demote week dividers, strengthen the count, keep mono for eyebrows, times and counts |
| L4 | Low | §5.7 | The stale warning is only in the footer, and its 12 h threshold equals the poll interval; partial failure, the count during loading, caching and long lists aren't specified | "UPDATED 2H AGO" in the meta line with a ~24 h threshold; per-club Retry; SWR caching; incremental rendering |
| L5 | Low | F02, F07, §5.4 | Copy: "touched", "for all days", "ANY DAY" (it also drops times), "ALL CLASSES"; locale | The rewrites listed in L5 |

## What works well (keep)

- **The agenda is the home screen, and the bar reads as a sentence.** Where / When / What is easy to remember and to explain.
- **A disciplined palette.** Selection is shown by inversion and there's no accent color. Dark mode comes almost free, and F08 looks right.
- **Sheets that apply live, with the count in the footer.** Feedback is immediate and there's no apply/cancel step (but see M3 about undo).
- **The time model.** Per-day rows in week order, built from native selects, are honest about the data, accessible and thumb-friendly, and map 1:1 onto the link format. H2 is about the default, not the model.
- **One canonical query string for both the cookie and share links,** absorbed with `replaceState`. It's elegant and deterministic.
- **No matches (F07).** One-tap fixes, plus "Swim runs at Greenwich Ave on Tue at 8:00 PM…". This is the best screen in the set.
- **Class families with their variant titles** listed under the family name (F03, "Charli XCX x Rufus Du Sol · Y2K").
- **Booking-open time with the 2–5 AM rule.** Equinox itself doesn't surface this well, and it's the most useful fact in F05.
- **First run never dumps all of Equinox.** Strong headline, city chips inline (F06).
- **Desktop reuses the sheet components,** and "Show all 43 New York clubs" is the right desktop collapse.
- **Honest data:** the UNOFFICIAL tag, the update stamp, no implied capacity, and "for ⟨regular⟩" on subs.

## Findings in detail

### C1 · Critical · Remembered filters expire after 7 days on iPhone Safari

**Where:** §7 Cookie ("written 300 ms after the last change", `Max-Age=34560000`); requirement 8; job 1.

**Problem.** As specified, the page writes `eqxc` through `document.cookie`. Safari's Intelligent
Tracking Prevention caps every cookie created through `document.cookie` at 7 days, whatever
`Max-Age` says. The app rewrites the cookie only when filters change. So the intended steady
state, setting filters once and then just opening the app, ends at the first-run screen a week
later. iPhone Safari is the primary platform ("a phone in a locker room"). Moving to localStorage
doesn't help, because Safari also deletes script-written storage after seven days of browser use
without interaction.

**Fix.** Let the web server turn the script-set cookie into an HTTP cookie. Cookies set by the
page's own server in an HTTP response aren't subject to the 7-day cap. The site is served
statically (per the repo's CLAUDE.md), and this needs only server config, no app server:
- Keep the `document.cookie` write as the instant path.
- Then `fetch('/prefs')`, an empty location that echoes the cookie it was sent:
  `add_header Set-Cookie "eqxc=$cookie_eqxc; Max-Age=34560000; Path=/; Secure; SameSite=Lax" always; return 204;`
  in nginx. Caddy can do the same with `{http.request.cookie.eqxc}`. Call it after each debounced
  change and once per app open, which slides the expiry forward. Re-issuing the cookie on every
  HTML response also works.
- URL-encode the value. The canonical string contains commas, which aren't valid cookie octets
  (RFC 6265) and some parsers split on them.
- Acceptance test: set filters in iOS Safari, come back after 8 or more days (or jump the device
  clock), and check that they're still there.

### H1 · High · A shared link overwrites the recipient's saved search

**Where:** §7 "Absorbing the link" steps 1–4; §5.7 shared-link state; F05.

**Problem.** The shared filters are written to the cookie on load, and the only backup,
`eqxc_prev`, is a session cookie. The typical recipient for job 3 is a member with their own saved
search. They open the link, look, and close the tab. The next morning their own clubs and times
are gone. Undo helps only if they act before leaving, and session cookies are unpredictable on
phones: they can vanish when the browser is evicted, or linger for weeks. The spec also doesn't
say what Undo does for a first-time visitor with nothing to restore.

**Fix.** Make a shared link a temporary view, not a write:
1. Parse the link, apply it in memory (plus `sessionStorage`, so a reload keeps the view), and
   call `history.replaceState(null, "", "/")`. Don't touch `eqxc`.
2. Show the banner "Viewing a shared search" with **KEEP** and **BACK TO MINE**. Editing any
   filter counts as KEEP: write the cookie and drop the banner. Closing the tab loses nothing.
3. If there are no saved filters (a first visit), keep it immediately and show the banner with
   ✕ only.
4. If the shared search equals the saved one, show no banner.

The URL still never changes and the link is still absorbed (requirement 10). The one risk §7
names is removed rather than mitigated.

### H2 · High · Time picker: the common case costs as much as the rare one

**Where:** §5.4 (Rows, New day defaults, Helper); F02; requirement 5.

**Problem.** Every selected day always gets its own row. Most members train in the same window
on each of their days ("Mon/Wed before work"), yet Weekdays with a morning and an evening range
is 5 rows × 2 chips, and All is 14 chips. In the 7-day stress render the Times section is about
800 px tall at 390 px wide. Every change has to be repeated per day, or pushed out with "Use
⟨Day⟩'s times for all days". That button copies from an invisible "most recently touched" day and
overwrites the others with no undo. The copy-on-select rule, the touched-day bookkeeping and the
helper all exist to work around the per-day default.

**Fix.** Offer two modes, matching the two link encodings that already exist (`time=` and
`su…sa=`):

```
TIMES · CLASSES STARTING BETWEEN            [ SAME EVERY DAY | PER DAY ]
MON · WED · SAT   [ 6:00 AM ▾ – 9:00 AM ▾  ✕ ]   [+]
                  [ 5:00 PM ▾ – 8:00 PM ▾  ✕ ]
```

- **Same every day** (the default): one row of ranges for all selected days. A newly selected
  day simply has these times, which satisfies requirement 5's default rule trivially.
- **Per day:** splits into the current per-day rows, each pre-filled with the shared ranges. Only
  here does the copy rule apply. A newly selected day copies the last day selected or edited, and
  its row briefly reads "Copied from Mon", which makes the hidden state visible.
- Switching back to Same when the days differ asks which day's times to keep (as day chips)
  instead of guessing.
- Links whose days differ open in Per day mode. The summary text gets simpler (M1).

The [walkthrough](#time-range-picker-walkthrough) below shows the common scenarios dropping from
about 9 taps to about 4, with the sheet staying one screen tall.

### H3 · High · "Empty means all" is invisible, and in Where it's a trap

**Where:** §5.3 Semantics, §5.5 Semantics; F03, F04, F09; requirements 3, 6, 7.

**Problem.**
- A chip that means "all 43 New York clubs" looks the same as one that means "2 of them": both
  are solid black. The same goes for "Yoga, all of it" and "Cycling, only Beats Ride" in F03. The
  lists don't help either. With Yoga on and nothing ticked, every yoga class shows an empty
  checkbox even though all of them are included.
- Tapping a solid chip to "see more" deselects it and clears its children. If it was the only
  city, the app falls back to first run behind the sheet.
- Consider a New York member with two clubs who taps Boston to browse. Every Boston club is
  instantly added to their results, and the app fetches all of those club files, before they've
  ticked anything. In first run, picking New York loads 43 club files over a locker-room
  connection, and then the user narrows it to one.

**Fix.**
- **Where: make a city a scope, not a filter.** Tapping a city lists its clubs, and nothing joins
  the results until a club is ticked, or until an explicit first row, "All 43 New York clubs", is
  ticked. Both levels are still multi-select (requirement 3), `city=` in links means "All …"
  ticked, and nobody downloads a whole city by accident. Until something is ticked, the footer
  reads "Pick a club".
- **What: a category still means "all of it"** (people do want all yoga), but say so. The first
  row of each selected category's group is "☑ All Yoga classes · 14". Ticking a specific class
  unticks it, and unticking the last class re-ticks it.
- **Give chips three states:** off (grey outline), all (black fill), and narrowed (black outline
  plus a count, as in "Cycling · 1" or "New York · 2"). The summary follows suit: "All Yoga · Beats
  Ride".
- When a chip with ticked children is deselected, re-tapping it within the session restores them
  (M3).

### H4 · High · Both searches are unusable with the keyboard up

**Where:** F03 (class search), F04 (club search); §5.3, §5.5; requirement 7.

**Problem.** The class search sits about 350 pt down the sheet, under three rows of category
chips. An iPhone keyboard with its suggestion bar is about 336 pt tall, which leaves about 140 pt
for results: roughly two rows, or none if the sticky footer rides above the keyboard. The club
search sits under four rows of city chips (about 390 pt), leaving room for one row at best. Search
is how members find "Swim: Pro", or their club among 43, and as drawn they'd be typing blind.

**Fix.** Specify a search mode. When the field gets focus, it pins to the top of the sheet body.
The chips collapse to a single line ("WITHIN YOGA, CYCLING ▾") or scroll away, the footer hides
while the keyboard is open (watch `visualViewport`), and results start right under the field.
Blur, Done, or clearing the field restores the layout. With the collapsed city block from M10,
the club search moves up as well.

### H5 · High · The calendar "booking opens" alarm won't fire for many Android and Google Calendar users

**Where:** §5.6 Actions, §9 Notifications; F05; requirement 9; `notifications-v2.md` §3 (v1).

**Problem.** The `.ics` is an event at class time, with a VALARM at the moment booking opens.
Google Calendar ignores VALARMs when it imports `.ics` files and applies the user's default
reminders relative to the event start. Here that means shortly before the class, a day after
booking opened. On Android, an `.ics` downloaded in Chrome often just lands in Downloads. The
member believes a reminder is set and misses the 26-hour window, which is worse than having no
feature at all. It also leaves a placeholder event for a class they may not get into.
`notifications-v2.md` says a relative trigger "survives every calendar app"; Google Calendar is
the exception that matters most.

**Fix.**
- Make the event itself the reminder: "Book: Beats Ride · Wed 7:00 AM · Greenwich Ave", placed
  at the booking-open moment, 15 minutes long, with the class page as its URL and in its
  description, and a VALARM of `TRIGGER:PT0M`. If an app drops the alarm, its default "at start"
  or "10 minutes before" reminder still lands close to the opening.
- Offer a Google Calendar template link next to the `.ics` on Android and desktop.
- Label the button for what it does: **REMIND ME TO BOOK · TUE 5:00 AM**.
- State rules: once booking is open, the reminder action disappears and Book stays primary; once
  the class has started, hide both.
- Write `startUtc` times into the file so travelers get the right moment.

### H6 · High · The densest controls break at 320 px

**Where:** §8 ("the layout holds at 200% zoom and 320 px width"); F02, F01; the 320 and 360 px
stress renders.

**Problem.** 320 px is WCAG's reflow benchmark (1.4.10). It's also the viewport of an iPhone SE
or mini with Display Zoom turned on. 200% page zoom leaves about 195 px on any phone. At 320 px the
range row is wider than its ~188 px column: two mono selects that can't wrap, each with a chevron,
plus ✕. The ✕ gets pushed out of its chip and lands on top of the "+" button. The When summary
truncates to "Mon, Wed, Sat ·…", so the bar no longer shows any time at all. At 360 px, the most
common Android width, everything still fits.

**Fix.** Put a container query on the range row. When the row can't fit, move the day label onto
its own line above its ranges, let the chip span the full width, drop the chevrons (the native
select still opens), and give ✕ a full 44 px. For the bar, use M1's two-line summaries, and below
about 340 px, stack the three filters as full-width rows with the label on the left and the
summary on the right.

### M1 · Medium · Filter-bar summaries wrap mid-phrase and drop the useful part

**Where:** §5.2, §5.4 Summary text; F01, F05, F06, F07.

**Problem.** At 390 px each cell is about 130 px wide, and all three summaries in F01 break
mid-phrase: "Greenwich Ave / +1", "Mon, Wed, Sat / · custom" and "Yoga · Beats / Ride". The spec
says overflow truncates with "+N", but the mock clamps to two lines instead. "custom" says nothing
about when. In first run, "Any club" contradicts §6 (an empty Where never means any club), and
it's set in `--fg-3`, which is 3.4:1.

**Fix.** Give each cell two deliberate lines: a primary line (14/600, `--fg`) and a secondary
line (13/400, `--fg-2`).

| Filter | Line 1 | Line 2 |
|---|---|---|
| Where | Greenwich Ave | + Hudson Yards, or + 2 clubs (for a whole city: New York / All 43 clubs) |
| When | Mon Wed Sat | 6–9 AM, 5–8 PM, or Times vary by day, or Any time |
| What | All Yoga | + Beats Ride, or + 2 classes |
| Empty | **Choose clubs** (black, a call to action); Any day; Any class (in `--fg-2`) | none |

Write the summary algorithm into §5.4:
- All seven days read "Every day".
- Sat + Sun read "Weekends".
- Wrap-around reads "Fri–Sun". With the Sunday-first strip it would otherwise come out as "Sun, Fri, Sat".
- If some selected days have ranges and others don't, the second line reads "Times vary by day".

### M2 · Medium · Adding a range: an unpredictable "+" and too coarse a grid

**Where:** §5.4 Range chip, Adding and removing ranges; F02.

**Problem.** "+" after 6–9 AM produces 11 AM–2 PM. Yet the realistic second window is the
evening, and so is the spec's own scenario (Mon 6–9 AM and 5–8 PM). Users would edit both selects
nearly every time. The first range is always 6–9 AM, whatever the user wants. And 30-minute steps
can't express "I can get there by 6:15", even though the mock's own data starts at :15 and :45
(8:15, 9:15, 9:45, 10:15, 5:45).

**Fix.**
- An empty row offers presets inline: **MORNING 6–9 AM · MIDDAY 11 AM–2 PM · EVENING 5–8 PM ·
  CUSTOM**. One tap creates a normal, editable range.
- "+" picks the complementary bucket: evening after a morning range, morning after an evening
  range, and otherwise the first uncovered 3-hour block.
- Use 15-minute steps. Seventy-three options is fine in native wheel pickers.
- Define the clamps: start options stop at 10:45 PM, and "start + 1 h" never goes past 11 PM.

### M3 · Medium · One-tap actions destroy work with no way back

**Where:** §5.3, §5.4, §5.5; F02, F04.

**Problem.**
- Switching a day off discards its ranges. Switching it back on copies another day, not its own.
- ✕ removes a range instantly.
- "Use ⟨Day⟩'s times for all days" overwrites every other day.
- The Weekdays, Weekends and All shortcuts are undefined: do they replace the selection or add to it? If they replace it, they discard ranges too.
- Deselecting a city or a category clears its ticked children. Deselecting the only city drops back to first run.

Sheets apply changes live and have no Cancel, so none of this can be backed out.

**Fix.** Within a sheet session, remember what was removed. A day switched back on gets its own
ranges back, and a re-selected city or category gets its ticked children back. Bulk actions (the
helper, the shortcuts, Clear) show an **UNDO** toast for 5 seconds. Define the shortcuts as
"select exactly these days".

### M4 · Medium · Class rows: booking is a bare arrow on mobile, and the deciding facts are the faintest

**Where:** §5.6 Class row, Tap to expand; F01, F05 and F08 vs F09; requirement 9.

**Problem.**
- Requirement 9 asks for a button to book. Mobile shows only a 20 px ↗ glyph, while desktop says
  "BOOK ↗". The arrow reads as "more" or "external link", not as "book", and the labeled "Book on
  Equinox" sits one tap deeper. Nothing signals that a row expands.
- For a member with 2–3 clubs, which club a class is at is the second most important fact. Yet
  it's the smallest, faintest text in the row: mono at 10 px in `--fg-2`, below the spec's own
  11 px. Meanwhile "Cycling Studio" or "Yoga Studio", which the class name already implies, gets a
  full 13 px line on mobile, a whole column on desktop, and a repeat in the expanded facts.
- Booking status (job 4) only appears after you expand a row.

**Fix.**
- Put a compact outlined **BOOK ↗** in the right column on mobile (44 px tall, about 64 px wide).
  The rest of the row toggles the details and carries a small chevron.
- Make the sub line "Greenwich Ave · Danielle Bernstein", with the club first whenever more than
  one club is in play. Show the studio only in the details, or in the row when it isn't the
  category's usual studio.
- Rows whose booking opens within about 24 hours get a mono tag: **OPENS 5 AM** or **OPEN**.
- Consider "7:00–7:45 AM" instead of "7:00 AM / 45 MIN". Members' windows are about when they're
  free, and with start-time matching an 8:45 class in a 6–9 window ends at 9:45.
- In an expanded row, replace the duplicate ↗ with the collapse chevron.

### M5 · Medium · Desktop: the rail runs off the screen while the results spend width on studio

**Where:** §4 Desktop; F09; the 1024 px stress render.

**Problem.**
- At 1280 × 800 the What panel's heading sits at the bottom edge. With per-day ranges and a class
  list, the rail runs well over 1,200 px tall, and "sticky left rail" doesn't say it scrolls on
  its own. It's also ordered least-changed first: Where, which is set once, is on top and takes
  the most space, while What, which changes most, is off-screen.
- The results column, about 880 px wide, shows about nine rows and gives a full column to studio.
  At 1024 px the heading wraps ("37 / CLASSES"), club names wrap ("GREENWICH / AVE"), and the
  "LINK COPIED" toast covers the meta line.
- An outlined BOOK box on every row makes the most-repeated element the heaviest mark on the
  page, heavier than the class names.
- Between 768 and 1023 px the mobile row stretches to about 1,000 px, leaving the ↗ about 900 px
  from the class name.

**Fix.**
- Rail: `position: sticky; top: <header>; max-height: calc(100vh - <header>); overflow-y: auto`.
  Once Where is set, collapse it to its summary plus an EDIT link, and order the panels When,
  What, Where. Alternatively, make every panel collapsible to its summary line, as on mobile.
- Columns: time · class + instructor · club · booking status ("Opens Tue 5 AM" / "Open") · Book.
  Drop studio.
- Make Book a text button ("BOOK ↗", underlined on hover) rather than an outlined box on every row.
- Anchor the toast under the Share button.
- Between 768 and 1023 px, cap the list at about 720 px and center it.
- For later (v1.x), consider a Week view, with the selected weekdays as columns and weeks as rows.
  A typical search of 3 days over 3 weeks then fits on one screen.

### M6 · Medium · Contrast and size: the lightest grey carries real text

**Where:** §3 tokens, §8 contrast claim; F01, F04, F05, F06, F08.

**Problem.** `--fg-3` is #8C8C8C on white (3.36:1) and #6E6E6E on black (4.12:1). Both are below
4.5:1 for body text, yet `--fg-3` carries information: the empty filter values ("Any club"), the
substitute's "for Michael Gervais" (F01, F05, F09), cancelled class names (§5.6) and search
placeholders (F04). That contradicts §8's "≥ 4.5:1 for text". Separately, the mock's mono text
runs 9–10.5 px (tags 9–9.5, labels and club 10, meta 10.5), below the spec's 11–13 px.

**Fix.** Use `--fg-2` (6.48:1 light, 8.63:1 dark) for all text, and keep `--fg-3` for disabled
controls and decorative glyphs such as the en dash in ranges. If a third text grey is needed, use
`#767676` in light mode (4.54:1) and `#757575` in dark mode (4.56:1). Set mono at 11 px minimum,
and information-bearing labels (club, NEW, CANCELLED) at 12 px.

### M7 · Medium · Screen-reader gaps the spec doesn't close

**Where:** §8. The first four items are spec-level, the last is in the mock.

**Problem.**
- The live region for the result count (the meta line) sits outside the sheets. With a modal
  `<dialog>` or an `inert` background, everything outside the sheet is removed from the
  accessibility tree, so changes that apply live are never announced.
- Link names repeat: "Open Beats Ride on equinox.com" four times on one day on mobile, and "Book"
  on every desktop row.
- Cancellation is shown only by strike-through and dimming, and screen readers don't announce
  strike-through.
- Heading structure: day headers are h2, but week dividers ("THIS WEEK") aren't headings at all.
  The count inside the h2 reads as "MONDAY, OCT 5 4", and the desktop "Clear" button sits inside
  the panel's h3.
- In the mock, but worth writing down: the day toggles are named "S" and "T" (the spec says full
  names); "Remove range" doesn't say which range; the Wed and Sat "+" buttons have no name; chips
  lack `aria-pressed`; and the checkbox rows are divs.

**Fix.** Add to §8:
- A polite live region inside each sheet ("37 classes"), debounced to about 500 ms.
- Unique link names, such as "Book Beats Ride, Monday Oct 5, 7:00 AM, Greenwich Ave, on equinox.com".
- A visible CANCELLED tag.
- "Remove Monday 6:00 to 9:00 AM".
- The day count as "4 classes", with "classes" visually hidden.
- Week dividers as h2 and days as h3.
- Heading text in sentence case, uppercased with CSS, because some screen readers spell out all-caps source text.
- `role="status"` on the toast and the shared-search banner.

### M8 · Medium · Time zones, DST and per-club horizons, two of which can mislead

**Where:** §5.4 Matching, §5.6 Booking status, §6; `shared/schema.ts` (`Club.lastDate`);
`shared/booking.ts`.

**Problem.**
- **Per-club horizons.** The schema stores each club's published `lastDate`, but the meta line
  shows the union ("NEXT 3 WEEKS · OCT 5 – 24"). Suppose Hudson Yards has published two weeks and
  Greenwich Ave three. Week 3 then quietly shows only Greenwich Ave classes, and the member
  concludes Hudson Yards has nothing. That breaks the "honest data" principle.
- **DST.** The horizon reaches London's clock change (Oct 25) next week and the US change (Nov 1)
  the week after. `bookingOpensAt` subtracts 26 absolute hours. Equinox may instead subtract 26
  wall-clock hours, which is plausible for a backend that reports Windows time-zone names. If so,
  every opening in the 26 hours after a change is off by an hour. After the fall-back, we'd say
  7:00 when booking opened at 6:00, and the alarm would fire late.
- **Mixed time zones.** With New York plus LA (or London) selected, the spec doesn't say whether
  the list sorts by local or absolute time, whether rows show a time zone, or in whose zone
  "Booking opens Tue 5:00 AM" appears when the device is somewhere else. It implies, but never
  states, that ranges are in club-local time.

**Fix.**
- Where a selected club's schedule ends, insert a row ("HUDSON YARDS: SCHEDULE PUBLISHED THROUGH
  OCT 17"), and derive "next N weeks" from the selected clubs.
- Check the DST behavior on Oct 25 with a member login. Until it's confirmed, for classes within
  27 hours after a transition, show and set the alarm for the earlier of the two candidate times
  ("opens ~6:00 AM").
- In the spec:
  - Group by club-local date and sort by club-local time.
  - Show a time-zone tag on rows ("PT") only when the selected clubs span time zones.
  - Ranges apply in club-local time.
  - Show booking times in club time, with the device's time in parentheses when they differ.
  - Every "now" comparison uses `startUtc`.

### M9 · Medium · Rules an implementer would have to guess

Each needs a one-line decision in the spec.

| | Where | Contradiction or gap | Suggested rule |
|---|---|---|---|
| a | §5.4 Matching vs §6 vs §5.6 | "Classes that started earlier today are hidden", vs "not ended: end > now", vs a "Started" booking status | Hide at start (`startUtc > now`) and drop "Started"; or keep them until the end, labeled IN PROGRESS. Pick one |
| b | §7 `cat` | The example omits `cycling` even though Beats Ride narrows Cycling | `cat` lists whole categories only; `class` implies its category (mirroring `city`/`club`) |
| c | §7 `time` | The example uses `time=6-9` plus `fr=17-20`, but the table defines `time` as "shared by every selected day" | Canonical form: `time` holds the most common set of ranges, and days that differ override it; ties go to week order |
| d | §7 | Dropping an unknown value can broaden the search: if the only `class` has vanished, any class matches | Keep it as a "not scheduled now" item that matches nothing, or say "showing all classes instead". The same applies to the saved cookie |
| e | §7 | Equivalent states: all 7 days without ranges vs no days; a city with every club ticked vs the city itself | Canonicalize to the shortest form |
| f | §5.4 | "Touched" is undefined: does editing a select count? Removing a range? Using the helper? | Define it, or remove the need for it with H2 |
| g | §5.4 | "First free 3 h block" is undefined when ranges overlap or cover the whole day | Free means not covered by the union of ranges; if nothing is free, disable "+" |
| h | §5.4 Days | Do Weekdays, Weekends and All replace the selection or add to it? Does tapping "All" again turn it off? | They select exactly those days; tapping "All" when all days are on clears them |
| i | §5.4 Range | Start ≥ 10 PM with the end pushed to start + 1 h; the end bound is exclusive | Start options stop at 10:45 PM; the latest end is 11 PM |
| j | §5.5 | A selected category with no classes at the chosen clubs is hidden, so it can't be deselected | Selected chips always show (with a 0) |
| k | §5.5 vs F03 | "ELSEWHERE" families (not at your clubs) appear in the mock but not in the spec | Decide; if kept, group them last as "At other clubs" |
| l | §5.5 Search | Scoping to "Within Yoga, Cycling" conflicts with "typing 'swim' lists every swim class" | Search all families; out-of-scope matches go in a second group, and ticking one adds its category |
| m | §5.5 | Categories are ordered "by count at the chosen clubs", yet F03 shows Yoga before Cycling | A fixed order (M10) |
| n | §5.6 | Are cancelled classes counted in "37 classes"? Do they match filters? | Shown and tagged, but not counted |
| o | §5.6 | How folded names display in results, given Equinox's casing ("THEME RIDE: …") vs "normal case" | Show the full cleaned name, title-casing an all-caps prefix |
| p | §4, §5.2 | The scope of "Clear" in sheets and desktop panels; there's no global reset | "Clear" clears this filter only; say so in the label ("Clear days & times") |
| q | §5.3 vs F04, F09 | "All 44" vs "43"; the "+5" and "+11" overflow chips aren't specified | Use the data; specify the overflow or drop it (M10) |
| r | §7 | Where "1 club in this link no longer exists" appears | As a second line in the shared-search banner |
| s | §7 Cookie | The value contains commas | URL-encode it (C1) |
| t | §4 | Two sticky layers (filter bar and day header) | Day header at `top: var(--filterbar-h)` |
| u | §5.1 | "On a phone, `navigator.share()`", but desktop Safari and Chrome have it too | Use `(pointer: coarse)` plus feature detection; otherwise copy |
| v | §5.5 ¶3 | The fold list is called "data-driven", but it's a curated `COLLAPSE_PREFIXES` with one entry, and `docs/class-families.md` was missing at review time | Write the doc; have the downloader flag prefixes with 3 or more one-off variants for review |

### M10 · Medium · Where/What sheets: chips crowd out the lists, and lists shuffle under your thumb

**Where:** §5.3, §5.5; F03, F04, F06, F09.

**Problem.**
- In F04 the city chips take about 185 pt before the club list starts, so only about five clubs
  are visible. A returning member rarely changes city.
- The "+5" chip (F04) and "+11" chip (F09) aren't in the spec, and both disagree with F06, which
  shows all 16 cities.
- If "Selected float to the top" happens on tap, the row you just ticked jumps away and the list
  shifts under your finger. The spec also doesn't say whether a selected club still appears in its
  area group.
- Category chips sorted "by count at the chosen clubs" move whenever Where changes, and again once
  club files load. That defeats muscle memory in an app built around repeat visits.
- Grouping for multiple cities is undefined. With New York plus Boston, area headings need a city
  level, and "Search New York clubs" needs a plural form.

**Fix.**
- Once a city is chosen, collapse the city block to one line ("NEW YORK · BOSTON  CHANGE") that
  expands on tap.
- Float selected items only when the sheet opens or a search clears, never on tap, and list them
  only under Selected.
- Use a fixed category order (Equinox's own). Hide zero-count categories, except selected ones.
- Group clubs as "NEW YORK — DOWNTOWN".
- Show all 16 cities (five rows of chips) instead of an overflow chip.

### M11 · Medium · Job 3 ("send my friend the Saturday options") means editing your own search

**Where:** §1 job 3; §5.1; the F01 header.

**Problem.** Share always encodes the whole current search. To send only Saturday, the member has
to change their own filters (rewriting their cookie), share, then change them back. A single class
can't be shared. And the share button lives in the header, which isn't sticky, so it disappears
once you scroll.

**Fix.**
- Before handing off to `navigator.share()` or the clipboard, show a short confirmation sheet:
  the readable summary, plus day chips pre-set to the current days ("Share: MON WED SAT"). Unticking
  a day narrows the link.
- Add **Share class** to the expanded row. It shares the equinox.com class URL, with "Beats Ride ·
  Wed Oct 7 · 7:00 AM · Greenwich Ave" as the text.
- Keep share reachable after scrolling: put a share icon at the end of the sticky meta line, or
  have the header collapse into the bar on scroll.

### L1 · Low · First run: lead people through all three filters

**Where:** F06, §5.7.

- The share icon is visible and looks enabled, though the spec says it's disabled. Hide it until
  a club is chosen.
- After Where, nothing leads to When or What, and many people will stop at "any day, any class":
  about 800 rows for two clubs over three weeks. On first run, change the sheet footer to "NEXT:
  WHEN →", then "NEXT: WHAT →", then "SHOW N CLASSES". Alternatively, use one filter sheet with
  WHERE · WHEN · WHAT tabs, which also speeds up later edits.
- With the Where model from H3, picking a city no longer downloads every one of its clubs.

### L2 · Low · Tap targets below the spec's own 44 px

**Where:** §2 principle 4, §8; F02, F03, F04, F09.

These controls are below 44 px:
- Chips: 40 px (34 px on desktop).
- Weekdays · Weekends · All: text links about 12 px tall.
- The helper: 32 px tall.
- The range ✕: 38 px wide (32 px on desktop).
- The search clear: 40 px.
- The desktop "Clear": 10 px text.

They pass WCAG 2.5.8 (24 px with spacing) but break the 44 px promise, which matters for sweaty
thumbs. Either size them up (44 px chips; the shortcuts as 44 px-tall text buttons) or restate the
principle as "44 px for primary controls, at least 24 px with spacing for secondary ones".

### L3 · Low · Visual hierarchy and typography polish

**Where:** F01, F05, F09.

- "THIS WEEK" (24 px display) is the largest type in the results and pushes the first class down
  about 70 pt, yet it's the least informative heading. Make week dividers mono eyebrows with a
  rule, or fold them into the day header ("MON, OCT 5 · THIS WEEK").
- On mobile the result count is a 10.5 px grey eyebrow; desktop sets it at 34 px. On mobile, use
  12–13 px in `--fg`.
- Mono in sentence case reads like code ("Booking opens Tue, Oct 6 · 5:00 AM"). Keep mono for
  uppercase eyebrows, times and counts, and use Inter for sentences.
- In the expanded row, the facts line repeats the studio and has no separators, so it wraps
  ambiguously ("ALL LEVELS WELCOME  CYCLING STUDIO / CYCLING"). Clamp the description to three
  lines with a MORE link.
- The wordmark's bold, all-caps "EQUINOX" is the element most likely to draw a trademark complaint
  if the link travels beyond friends. Consider "CLASSES · for Equinox members", or setting
  "EQUINOX" in a lighter weight. This one is the owner's call.

### L4 · Low · States: stale, partial, loading, offline

**Where:** §5.7.

- The stale warning lives only in the footer, after the whole list. Replace the redundant "NEXT 3
  WEEKS" in the meta line with "UPDATED 2H AGO", which turns black and reads "MAY BE OUT OF DATE"
  once stale.
- The repo's CLAUDE.md says the downloader polls every 12 h, so the spec's "> 12 h" stale
  threshold would fire just before nearly every refresh. Set it at about twice the interval
  (24 h), and derive it from the configured interval rather than hard-coding it.
- Partial failure (one club file out of three): show the clubs that loaded, plus an inline
  "Hudson Yards didn't load · RETRY".
- While a newly ticked club is loading, the footer's count is wrong. Show "LOADING…" in the button.
- Locker-room networks: serve `index.json` and the club files with an ETag and
  `stale-while-revalidate`, so repeat opens paint instantly from cache, under the "Updated …"
  stamp.
- A whole-city search can return 5,000+ rows. Specify incremental rendering (days render as they
  approach the viewport) in a way that keeps sticky headers working.

### L5 · Low · Copy and locale

**Where:** F02, F07, §5.4, §5.7.

- "New days copy the times of the day you touched last. Empty day = any time." → "New days start
  with the times you set most recently. A day with no times means any time."
- "Use Sat's times for all days" → "Apply Sat's times to Mon and Wed". It only affects the
  selected days.
- In F07:
  - "ANY DAY" also drops that day's time ranges, so say "ANY DAY, ANY TIME".
  - "ALL CLASSES" → "ANY CLASS", matching the placeholders.
  - Add a count to each fix ("ANY TIME ON TUE · 3").
  - The hint "Swim runs at Greenwich Ave on Tue at 8:00 PM…" is excellent. Spec it: relax only the When filter, and list up to three weekly slots.
- For London clubs, consider 24-hour times via `Intl.DateTimeFormat` for en-GB users. Keep
  Sunday-first weeks, which match Equinox's.

## Time-range picker walkthrough

The owner asked for this control to be designed "very carefully", so here it is on its own.

**What's right, keep it:**
- One row per selected day in week order, built from native selects.
- The "CLASSES STARTING BETWEEN" label.
- Impossible end times disabled.
- Overlapping ranges simply union.
- A row with no ranges reads "Any time".
- New days copy existing times, which meets requirement 5.

The problems are defaults, density and safety, not the model.

Taps after opening the When sheet (a native select counts as 2 taps: open and pick):

| Scenario | As designed | With H2 + M2 |
|---|---|---|
| Mon + Wed, 6–9 AM | 4: M, +, W, Show | 4: M, W, MORNING, Show |
| Weekdays, 6–9 AM and 5–8 PM | 9: Weekdays, + on Mon, + (gives 11 AM–2 PM), start → 5 PM (2), end → 8 PM (2), "Use Mon's times…", Show; the sheet now holds 10 chips | 4: Weekdays, MORNING, + (defaults to evening), Show; one row |
| Every day, 6–9 AM | 4: All, + on Sun, "Use Sun's times…", Show; the sheet holds 7 rows | 3: All, MORNING, Show; one row |
| Weekdays 6–9 AM, Sat 9 AM–1 PM | 9: Weekdays, + on Mon, "Use Mon's times…", S, Sat start (2), Sat end (2), Show | 9: Weekdays, MORNING, S, PER DAY, Sat start (2), Sat end (2), Show |

The per-day case costs the same either way, since it's inherently specific. The common cases get
about twice as fast, and the sheet stays one screen tall. Other open questions for this control
are in M3 (undo), H6 (narrow layout), M1 (summary text) and M9 f–i (rules).

On requirement 5's wording: "the same as the last one already selected" most naturally means the
most recently *selected* day. §5.4 widens this to the most recently *touched* day (selected or
edited). That's defensible, but confirm it with the owner. Under H2, it only matters in Per day
mode.

## Framework notes

### First impression (two seconds)

- **F01:** the eye goes from the wordmark, to the three bold summaries, to "THIS WEEK", to the
  first class. Within two seconds it's clear this is a list of classes filtered by club, time and
  type. The tone is calm, premium and unmistakably Equinox. The biggest opportunities are the bar,
  whose summaries wrap and hide When behind "custom", and the unlabeled ↗.
- **F06** is the strongest frame: one headline, one instruction, one set of chips.
- **F02:** the day strip, with its black blocks, rightly dominates, since days gate everything
  else. The right edge is busy, with a chevron, ✕ and "+" packed into about 100 px.

### Visual hierarchy

- **What draws the eye first:** the wordmark and "THIS WEEK", the largest type. It should be the
  filter summaries and the first class (L3).
- **Reading flow:** time, then name, then the sub line, then the club tag, then ↗. That's a clean
  left-to-right scan, but the club, which is key for multi-club members, comes last and faintest
  (M4).
- **Emphasis:** selection by inversion is crisp, and the black rules under day headers give the
  list a good rhythm. On desktop, the outlined BOOK boxes overweight a repeated action (M5).

### Consistency

| Element | Inconsistency | Fix |
|---|---|---|
| Book action | ↗ glyph on mobile, "BOOK ↗" on desktop, "BOOK ON EQUINOX ↗" when expanded | "BOOK ↗" in rows everywhere; the expanded row keeps the long form |
| Counts | "~120/wk" (§5.3), "~12 / wk" (§5.5), "9/WK" (F03) | One format: "9/WK", mono, no tilde |
| Club hint | §5.3 says a "~120/wk" class count; the mock shows the area | Show the area (in the Selected group); the class count doesn't help anyone choose a club |
| City overflow | "+5" in F04, "+11" in F09, all 16 cities in F06 | Show all 16 (M10) |
| Club total | "All 44" in §5.3, "43" in F04 and F09 | Use the data |
| Category order | "Cycling, Yoga, …" in §5.5, "Yoga, Cycling, …" in F03 | A fixed order |
| Mono size | 11–13 px in the spec, 9–10.5 px in the mock | Follow the spec (M6) |
| Filter bar height | 64 px in the spec, 72 px in the mock | 72 px, which fits two lines (M1) |
| Summary overflow | "+N" truncation in the spec, a 2-line clamp in the mock | Structured two-line summaries (M1) |
| Quick-fix labels | "Any time on Tue", "Any day", "All classes" vs the "Any class" placeholder | Start them all with "Any …" (L5) |
| Range selects | Chevrons on mobile, none on desktop, where they don't read as editable | Keep a chevron, or an underline on hover |
| Target sizes | 44 px promised; 40, 38, 34 and 32 px used | L2 |

### Accessibility snapshot

| Pair | Ratio | Used for | Verdict |
|---|---|---|---|
| `--fg-2` #5E5E5E on #FFFFFF | 6.48:1 | Secondary text | Pass |
| `--fg-2` #A6A6A6 on #000000 | 8.63:1 | Secondary text, dark mode | Pass |
| `--fg-3` #8C8C8C on #FFFFFF | 3.36:1 | Placeholders, "for …", cancelled names; chip borders | Fails as text; passes 3:1 as a UI border |
| `--fg-3` #6E6E6E on #000000 | 4.12:1 | The same, in dark mode | Fails as text; passes as a UI border |
| `--fg-3` on `--fill` #F4F4F4 | 3.06:1 | Chip border on hover | Barely passes 3:1 |
| `--line` #E5E5E5 on #FFFFFF | 1.26:1 | Hairlines | Fine as decoration, but never the only boundary of a control |

- **Touch targets:** L2. **Reflow:** H6. **Screen readers:** M7.
- **Motion:** reduced-motion handling is specified.
- **Focus:** the focus trap, Esc and focus return are specified for sheets.
- **Text size:** body text at 15 px is good. Mono is too small (M6).

## Requirements check

| # | Requirement | Verdict | Notes |
|---|---|---|---|
| 1 | Desktop and mobile, thoughtfully designed | Partly | Mobile is well thought through. The desktop rail runs off-screen and wastes width (M5), and 320 px breaks (H6) |
| 2 | Black and white, Equinox aesthetic | Yes | Faithful. Tune the use of greys (M6) and limit mono (L3) |
| 3 | Multi-select city, then club | Yes, with a trap | "Empty = all" adds whole cities by accident (H3) |
| 4 | S M T W T F S multi-select | Yes | Needs full screen-reader names (M7); shortcut behavior is undefined (M9 h) |
| 5 | Ranges per day, "+", new days copy the last | Yes | The model is right. The common case is too heavy (H2), "+" defaults (M2), destructive edits (M3), narrow layout (H6). Confirm "touched" vs "selected" |
| 6 | Category filter | Yes | Use a fixed order; selected-but-hidden categories can get stuck (M10, M9 j) |
| 7 | Class families by prefix, with search | Yes, but | Search is nearly unusable with the keyboard up (H4); the curation process is missing (M9 v) |
| 8 | A cookie remembers the selection | At risk | Safari's 7-day cap (C1); shared links overwrite it (H1) |
| 9 | Book button; notify in v2 | Partly | Mobile uses a bare ↗ (M4); the calendar stand-in is unreliable on Google and Android (H5) |
| 10 | Static URL, short share link, link absorbed | Yes | Make absorbing non-destructive (H1); sharing for job 3 has friction (M11) |

## Appendix: stress renders

These were made from a scratch copy of `mock/index.html` with headless Chrome. Nothing in the repo
was changed. To reproduce:

- **320 px and 360 px:** add `.phone{width:320px!important}` (or `360px`) and open `#f01` or
  `#f02` at that window width.
- **Desktop at 1024 px:** add `.desk{width:1024px!important}` and open `#f09`.
- **7 days × 2 ranges:** in f02, duplicate the Mon row for every day, set all toggles to on, and
  use `.phone{height:1700px}`.
