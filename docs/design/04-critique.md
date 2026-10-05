# equinox-classes: post-build design critique (round 2)

Status: review of the built app against [`03-handoff.md`](03-handoff.md) · 2026-10-04 (evening, US
Eastern). Reviewed build: the one captured in [`build-shots/`](build-shots/) (20:30) and its
production `dist` (20:31), source read 20:35–20:47. Round-1 findings: [`02-critique.md`](02-critique.md).

## Summary

1. The build is faithful to the handoff and reads as Equinox. At 390 and 1280 px the core loop (city → area popover → results → sheets → in-app detail → book or remind) works, and most round-1 findings are fixed: the server-refreshed cookie, the temporary shared view, explicit "All …" rows with three-state chips, the reminder as an event, the two-line sticky bar and 320 px stacking.
2. **Critical:** the agenda drops back to 4 days whenever the app re-renders: opening or closing a class, any sheet or toast, and the 60-second clock. Focus is lost every time a detail closes. Without scroll anchoring, which as far as I know Safari doesn't implement, the list jumps back about a week (C1).
3. **High:** inside tablet dialogs, the area popover and the reminder menu open far below their anchors and off-screen (H1). Two-digit hours are clipped in the time selects at 390 px and in the desktop rail, and AM/PM is the part that gets cut (H2). The "Narrow it down" hint breaks reflow at 320 px and clips the sheets (H3).
4. **Medium:** the Undo toast covers the sheet's main button and can't be reached by keyboard. Focus drops after you change a start time or clear a search, and Esc then stops working. One failed club leaves "Loading…" on screen forever. The When summary loses its second range at 390 px. In first run, club search still sits under the city chips. Desktop first run shows the city chips twice.
5. **Requirements:** 8 of 11 are met and 3 mostly (1, 3, 7). The filter model was rewritten ("owner round 3") during this review, so the two findings marked † need a re-check. All the others are independent of the model and were still in the source at 21:05.

## Prioritized findings

"Shot NN" is `build-shots/NN-*.png`. "x:name" is an extra capture (see [Method](#method-and-evidence)).
Line numbers refer to the reviewed source.

| # | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| C1 | Critical | `results/Agenda.tsx:33`, `data/useSchedules.ts:80`, `App.tsx:66`; x:q01–q03 | Any re-render of `Main` resets the agenda to 4 day groups and remounts the rows. That covers opening or closing a detail or sheet, every toast, the 60 s `useNow` tick and returning to the tab. After a detail closes, focus lands on `body` because the row it opened from is gone. With scroll anchoring off, closing one detail moved the view from Fri Oct 16 to Fri Oct 9 (21,000 px). | Memoize `schedules` (keyed on the club list plus a load counter). Reset the chunk limit only when the canonical filter query changes, never when `days` merely changes identity. In `Sheet`, re-find the opener by a stable key when it's no longer in the DOM. |
| H1 | High | `Sheet.module.css:90` + `Popover.module.css:16`; x:t01, x:t06 | Tablet (768–1023 px): the centered sheet's `transform` becomes the containing block for the popover's `position: fixed`, but the coordinates are computed against the viewport. The area popover opens 440 px below its chip with ALL/GO off-screen, and the reminder menu opens 290 px below its button, off the bottom. | Center the dialog without `transform` (`inset: 0; margin: auto; height: fit-content`), or portal popovers out of the panel. |
| H2 | High | `TimeSelect.module.css:15,19,37`, `DayTimeRow.module.css:75`; x:l01, x:l03 | Time selects clip two-digit hours at 390 px and in the desktop rail ("10:45 AI", "12:15 PI", "10:45 A"): 67 px of text has 59–60 px of room. The cut-off part is AM/PM. | Use the spec's 13 px mono and trim the padding to 8/18. Put the rail into the narrow layout (day label above the ranges, so the chip spans the full width). Test with 10:45 AM–12:15 PM. |
| H3 | High | `NarrowHint.module.css:16–20`; x:h01, x:h02, x:n01 | At 320 px the hint's button row doesn't wrap, so the page is 339 px wide and scrolls sideways. In Chromium the fixed sheets size to 339 px, which cuts off their ✕ and footer. The hint shows right after the first club is picked. | Add `flex-wrap: wrap` to `.actions`, and a no-horizontal-overflow check at 320 px in the screenshot script. |
| M1 | Medium | `Toast.module.css:24–29`, `App.tsx:51`; x:u01 | In a sheet, every Undo toast (Clear, shortcuts, Apply, removing a city or category) sits exactly on "SHOW N CLASSES" for 5 s (toast 784–828 px, button 788–832 px), hiding the new count. The toast lives outside the dialog, so Tab never reaches UNDO and VoiceOver may not announce it. | Keep the in-flight 88 px lift. Render the toast inside the open sheet, so UNDO is in the dialog's tab order and live region. Pause the timer on hover or focus. |
| M2 | Medium | `DayTimeRow.tsx:42` (key `${i}-${r.start}`), `SearchField.tsx:29`, `Sheet.tsx:47` | Focus drops to `body` in two cases: changing a start time (the range remounts) and clearing a search (the focused ✕ unmounts). Esc is handled on the panel, so after a drop it no longer closes the sheet. All three verified. | Key ranges by index or a stable id. Refocus the input after Clear. Listen for Esc on `document` while a sheet is open. |
| M3 | Medium | `MetaLine.tsx:15`, `FilterSheets.tsx:32`; x:e02, x:f01 | When one club file fails, the meta line reads "Loading 21 of 22 clubs…" forever, every sheet's main button reads "LOADING…", and the sheet's live region goes silent. `Results.tsx` counts failures correctly, but these two don't. | Treat failed as settled (`loaded + failed < total`), and say so: "374 classes · 1 club didn't load". |
| M4 | Medium | `FilterBar.module.css:7`; shots 09, 14, 16 | At 390 px the When line 2 truncates to "6–9 AM, 5–8 …", so the evening range is lost, which is the reason the summary has two lines. The 1.25/1/1 grid (the spec says equal cells) leaves 95 px for a 100 px string. | Use equal columns, which leave 106 px. Then fall back to "6–9 AM +1" when the text still doesn't fit. |
| M5 | Medium | `where/WherePanel.tsx:17,47`; x:w03 | When a city is picked inside the Where sheet (first run, or after CHANGE), six rows of chips stay above the club search (the field is at y = 519 px), so the keyboard hides the results. §5.5 says club search gets the search mode too. | Collapse the city block after ALL, GO or a direct city tap, and add the What-style search mode. |
| M6 | Medium | `FirstRun.tsx`, `FilterRail.tsx:25`; shot 20 | Desktop first run shows the same 16 city chips twice, in the rail and in the hero, plus an empty "CATEGORY" section in the rail. | On desktop first run, show the chips once (collapse rail Where to "Choose a city"), and replace the empty section with "Pick clubs to see class types". |
| M7 † | Medium | `lib/filters/where.ts:95–105`, ClubList all-row; x:x01 | Unticking your only club widens the search to the whole area: Hudson Yards (472 classes) becomes "Midtown · 9 clubs" (2,320). | Removing the last tick in a group should drop the group, with Undo. Re-check under the round-3 explicit-selection model. |
| M8 † | Medium | `state/FiltersContext.tsx:56`; x:c01 | Saved items that have left the data are dropped silently and can widen the search: a stale class key turned into "Any class" with no note. §8 requires a note. Nine seasonal families (Halloween ×5, Thanksgiving ×4) will disappear after their season. | Return `dropped` on the cookie path and toast "1 saved class isn't on the schedule anymore". Consider folding seasonal prefixes. |
| L1 | Low | `Button.module.css:21–25`, `DayTimeRow.module.css:44–46` | 36 px targets on phones (the spec says 44): WEEKDAYS/WEEKENDS/ALL, the presets, CHANGE, SHOW ALL, MORE and the hint buttons. | Use `md` (44 px) below 1024 px. |
| L2 | Low | `lib/ranges.ts:14–18`, `lib/filters/when.ts:26–30`; x:l01 | The presets read "MORNING / MIDDAY / EVENING" without their times (the spec shows "MORNING 6–9 AM"). After a reload, "Apply ⟨day⟩'s times" can offer to copy an "Any time" day over real ranges. | Show the range under the label. Fall back to the most common range set (the `time=` value) as the source. |
| L3 | Low | `FilterBar.tsx:15` + `.module.css:8`; x:b02 | After a portrait view under 340 px, rotating to landscape keeps the bar 162 px tall and sticky, half of a 320 px-tall screen. The measured height feeds its own `min-height`, so the bar can only grow. | Publish the measured height to a separate variable that's used only for the sticky offset. |
| L4 | Low | `ClassRow.tsx:43`, `time.ts:128`, `ClassDetail.tsx:43`; x:z01 | Rows mixing time zones: "10:20 AM GMT+1" overflows the 84 px time column into the class name. London shows as "GMT+1". The detail eyebrow omits the zone (§5.7). | Put the zone tag on its own line, map London to "UK", and add the zone to the eyebrow when it differs from the device's. |
| L5 | Low | `detail/ClassDetail.tsx`; shot 12, x:z04 | The detail is a full-height sheet with about 35% empty space. BOOK stays primary before booking opens, when REMIND is the useful action. A cancelled class would still say "Booking is open" and offer BOOK. MORE appears by length (over 160 characters), not by actual overflow. | Size the sheet to its content. Swap the emphasis while booking hasn't opened. Branch on `isCancelled`. Detect overflow. |
| L6 | Low | `RailPanel.tsx:33–35`, `FilterRail.module.css`, `ClassRow.module.css:91`; x:r01, x:d03 | Desktop: with the banner showing, the rail's last rows sit below the fold and scrolling over the rail can't reach them (overscroll is contained). Club names wrap at 1024 px ("HUDSON / SQUARE", round-1 M5). Collapsed Where shows a chevron, not "Edit". The panel `h2` is inside a `button`. | Cap the rail at the viewport height minus its top offset. Give the club column `minmax(12ch, 1fr)` and the booking column `max-content`. Use the `<h2><button>` pattern. |
| L7 | Low | MetaLine, FilterSheets, ClassRow, NoMatches, LoadError | Copy and numerals: "7336 classes" and "SHOW 5016 CLASSES" have no separators. "–7:15 AM" in DM Mono reads like a negative number. The no-matches hint names only the first What token and can list three Monday slots. Members see "index.json: HTTP 503". | Use `toLocaleString()`. Show the end time as "–7:15", or set it in Inter. Group the slots by weekday. Use a plain-language error sentence. |
| L8 | Low | `what/WhatPanel.tsx:28`, `FamilyList.tsx:50`, `shared/families.ts`; shot 07 | Search mode shows "WITHIN YOGA" above Cycling results. "Theme Ride" repeats as its own sublabel. Seasonal one-offs are separate families. | Label it "SELECTED: YOGA". Skip a variant that matches its family after `displayName`. Review seasonal folding. |
| L9 | Low | `Popover.tsx`, `MetaLine.tsx:19`, `DayToggles.tsx`, hover rules | The area popover doesn't contain focus: Tab leaves it while it stays open (x:k01). There's no "Skip to results" link, and desktop has 60+ tab stops in the rail. The meta live region announces every loading step, with no 500 ms debounce. There's no roving tabindex on the days. Hover styles aren't gated by `(hover: hover)`. | Close the popover on focus-out or trap focus. Add a skip link. Announce the final count only. Add roving tabindex. Gate the hover rules. |
| L10 | Low | `App.tsx:77`, `Toast.tsx:21–25`; x:s03 | Without Web Share, "LINK COPIED" lands inside the black shared-search banner. A clipboard failure shows a toast instead of the read-only URL sheet in §5.1. Editing a shared view silently replaces the saved search (as the spec says). | Place the toast below the banner. Add the URL sheet. Toast "Saved as your filters · UNDO". |
| L11 | Low | `index.html`, `Header.module.css:46–50`, gutters | `viewport-fit=cover` without left/right safe-area padding, so content sits under the notch in landscape. UNOFFICIAL disappears below 360 px. There's no static shell, so the screen is blank until the JS and fonts load. Partial loads insert rows mid-day. In dark mode the banner is a white slab. | Add `env(safe-area-inset-*)` to the gutters. Keep the tag and shrink the wordmark instead. Inline a header and skeleton in `index.html`. Hold the skeleton about 1 s. Outline the banner in dark mode. |

## Findings in detail

### C1 · Critical · Opening a class, or the clock ticking, rebuilds the agenda and loses your place

**Problem.** `useSchedules` returns a new `schedules` array on every render (`useSchedules.ts:80`), so
`buildResults` (`App.tsx:66`) recomputes on every render of `Main`, and `Agenda` resets its chunk
limit whenever `days` changes identity (`Agenda.tsx:33`). `Main` re-renders when a sheet or detail
opens or closes, when the App-level toast shows or hides, when `useNow` ticks (every 60 s) and when the tab
regains visibility. Each time, the list shrinks to 4 days, unmounts everything past them, and the
800 px IntersectionObserver re-grows it 4 days at a time.

**Evidence (Chrome, verified):**
- Clock tick: 16 → 4 → 8 → 12 → 16 day groups over a few frames, with scrollY dropping from 34,756 to 12,475 and coming back.
- Open and close a class past day 4: the list goes from 16 to 12 groups and focus ends on `body` (x:q01). The opener row was remounted, so `Sheet`'s `opener.focus()` hits a detached node.
- Chrome's scroll anchoring hides the jump. With `overflow-anchor: none`, which emulates a browser without anchoring, closing one detail moved the viewport from **Friday, Oct 16 to Friday, Oct 9** (x:q02 → x:q03).

As far as I know WebKit doesn't ship CSS scroll anchoring, so on iPhone, the primary device, expect
that jump after every class you open past the fourth day, and about once a minute while reading. A
device check would confirm it.

**Fix.**
1. Memoize `schedules` in `useSchedules`: `useMemo(..., [key, loadVersion])`, bumping `loadVersion` when a file lands.
2. Pass `Agenda` a `resetKey` (the canonical query from `encodeFilters` plus the club list) and reset the limit only when that key changes. A new "now" should never shrink the list.
3. Memoize the `ResultsContext` value. It also saves a full `buildResults` pass (about 7–15k classes for a whole city) on every sheet toggle.
4. `Sheet`: if `opener.isConnected` is false on close, re-query the row by a `data-key` and focus that.

### H1 · High · Tablet: popovers inside sheets land far from their anchor

**Problem.** From 768 px the sheet is a centered dialog using `transform: translate(-50%, -50%)`
(`Sheet.module.css:90`). A transformed ancestor becomes the containing block for `position: fixed`
descendants, so the popover's viewport coordinates (`Popover.tsx:42–51`) are applied relative to the
panel and offset by the panel's position.

**Evidence (820×1180):**
- The New York chip sits at y = 502–546, but the area popover renders at y = 941 and runs 193 px past the viewport, so ALL and GO can't be reached (x:t01).
- The reminder menu, which shows on non-Apple devices, renders at y = 1118 under a button that ends at 826 (x:t06).
- On phones the panel has no transform after its 220 ms rise, so both work there (x:w02, x:p02).

**Fix.** Center the dialog without a transform: `position: absolute; inset: 0; margin: auto;
height: fit-content; max-height: 85vh`, with the animation on opacity only. That's the smallest
change and it fixes both popovers. Alternatively, portal popovers into the sheet's layer root, which
isn't transformed.

### H2 · High · Time selects cut off AM/PM for 10, 11 and 12 o'clock

**Problem.** Each select gets 98 px at 390 px, minus 12 + 26 px of padding, which leaves 60 px for
14 px DM Mono. "10:45 AM" needs 67 px. In the desktop rail, chevrons hide below 250 px of
container, but the 8 + 8 px padding still leaves 59 px. The meridiem is what gets clipped: "10:45 AI",
"12:15 PI" on the phone (x:l01) and "10:45 A – 12:15 P" in the rail (x:l03). It's common: 10–11 AM and
12 PM starts, and 10 PM ends. At 320 px it happens to fit, because the narrow layout gives the chip
the full width (x:l02).

**Fix.**
- Use `--font-mono-time`, which is 13 px per the spec, not the raw 14 px.
- Set the padding to 8 px left and 18 px right.
- Raise the `dayrows` container query from 300 to about 330 px so the rail uses the narrow layout, where the chip spans the full width.
- Add a 10:45 AM–12:15 PM + 8:45–10:45 PM case to the screenshot script.

### H3 · High · 320 px: the "Narrow it down" hint breaks reflow and clips every sheet

**Problem.** `.actions` is `display: flex` with no wrap (`NarrowHint.module.css:16–20`).
At 320 px the row (DAYS & TIMES + CLASS TYPES + ✕) ends at x = 339, so the document is 339 px wide.
In Chromium, a page that overflows widens the layout viewport. The fixed sheets then size to 339 px
and get clipped: the When and Where sheets lose part of their ✕, the right edge of the day strip and
the end of the primary button (x:h02, x:n01). At 360 px and up it fits. The hint appears exactly when
a 320 px user has just picked their first club. Round-1 H6 was about this width, and the spec promises
reflow at 320 px (§9).

**Fix.** Add `flex-wrap: wrap` to `.actions`, or pin the ✕ to the top-right of the hint box. Add
`scrollWidth === clientWidth` assertions at 320 px to `shoot.mjs` so this stays fixed.

### M1 · Medium · The Undo toast covers the sheet's main button and is out of keyboard reach

At 390 px the bottom toast (y = 784–828) covers "SHOW 1667 CLASSES" (y = 788–832) for 5 s after
Clear, a shortcut, Apply, or removing a city or category (x:u01). The member can't see the new count
or use the button until the toast leaves.

The toast is also `left: 50%` with an auto width, so it shrinks to half the viewport and wraps to three
lines. That's addressed in flight: it's `nowrap` now.

Because the toast renders outside the sheet (`App.tsx:51`), the sheet's focus trap never reaches UNDO
(30 Tabs, never reached), and with `aria-modal` VoiceOver can treat the toast's live region as hidden.

In-flight round-3 CSS (`Toast.module.css:37–40`) lifts the toast 88 px while a sheet is open, which
fixes the overlap. Keyboard and screen-reader reach remain: render the toast inside the active
dialog, or put UNDO in the sheet footer for 5 s, and pause the timer on hover or focus (WCAG 2.2.1).

### M2 · Medium · Focus drops to `body`, and then Esc stops working

- **Start time.** The range key includes the start minute (`DayTimeRow.tsx:42`), so changing a start remounts the range and the focused select disappears. Verified on desktop and phone. With Chrome on Windows, a single arrow key on a closed select is enough.
- **Clear search.** The ✕ unmounts while focused (`SearchField.tsx:29`). Verified.
- **Esc.** `Sheet` handles Escape in the panel's `onKeyDown` (`Sheet.tsx:47`). Once focus is on `body`, Esc does nothing. Verified: the sheet stayed open.

**Fix.** Key ranges by index, or by an id assigned on creation. Refocus the input after clearing. Add a
`document` keydown listener while a sheet is open.

### M3 · Medium · One failed club file leaves "Loading…" up forever

With one club file returning 503:
- The other 21 clubs render, and the "BOND STREET DIDN'T LOAD · RETRY" row is right (x:e02).
- But `MetaLine` (`stillLoading = loaded < total`) shows "Loading 21 of 22 clubs…" indefinitely.
- Every filter sheet's primary button reads "LOADING…" (x:f01), and its live region announces nothing.

`Results.tsx` already does `loaded + failedIds.length < total`, so reuse that logic. Show the count
along with the failure ("374 classes · 1 club didn't load").

### M4 · Medium · The When summary drops its second range at 390 px

Measured at 390 px: the cells leave 121 / 95 / 96 px for text. "6–9 AM, 5–8 PM" is 100 px, so it
renders as "6–9 AM, 5–8 …" (shots 09, 14, 16). The bar exists to show your window while you scroll,
and round-1 M1 asked for exactly this line. The spec calls for three equal cells, which would give
106 px and fit. Longer sets ("6–9 AM, 11 AM–2 PM" is 127 px) still need a fallback: "6–9 AM +1", or
"2 time ranges".

### M5 · Medium · Club search can still end up under the chips (H4 partly regressed)

`WherePanel` collapses the city block only if a city was selected when the sheet opened
(`WherePanel.tsx:17`). Picking a city inside the sheet, from the bar's "Choose clubs" or after CHANGE,
leaves all 16 chips expanded, and the club search lands at y = 519 (x:w03). With an iPhone keyboard up,
about 470 px of the sheet is visible, so iOS scrolls the field into view and the results stay hidden.
The search field has no `onFocusChange`, so club search never gets search mode, although §5.5 says it
should.

**Fix.** Collapse the block after ALL, GO or a direct city toggle (keep CHANGE), and reuse
WhatPanel's search mode.

### M6 · Medium · Desktop first run: the chips twice, and an empty section

At 1280×800 (shot 20), the rail's Where panel opens because Where is empty, so the 16 city chips
appear in the rail and again in the hero, one beside the other. The What panel shows a "CATEGORY"
label with nothing under it, because no clubs means no category counts. The first desktop impression
asks "which one do I click?" and looks half-loaded.

**Fix.** On desktop first run, keep the hero chips and collapse rail Where to a one-line "Choose a
city" pointer. Replace the empty category block with "Pick clubs to see class types", or hide it.

### M7 † · Medium · Unticking your only club widens the search

Under the reviewed model, no ticks in a group means the whole group. Ticking Hudson Yards (from club
search or a link) adds Midtown narrowed to it. Unticking it shows "All 9 Midtown clubs" and 2,320
classes instead of 472 (x:x01). Unticking is expected to remove. The round-3 explicit-selection model
may resolve this. If it doesn't, removing a group's last tick should remove the group, with Undo.

### M8 † · Medium · Saved filters lose items silently

`initialState` decodes the cookie and ignores `dropped` (`FiltersContext.tsx:56`). A saved class key
that isn't in the new data vanishes, and if it was the only What item the search becomes "Any class",
with no banner or toast (x:c01). §8 says the drop is noted.

The data makes this likely. Seasonal titles are their own families: "Halloween: Ghost Ride" (69
classes), "Halloween: Spellbound Salutations", "Thanksgiving: Endurance Ride" and six more. Anyone
who ticks one loses it, and their What filter, in November.

**Fix.** Toast "1 saved class isn't on the schedule anymore · EDIT". Consider folding seasonal prefixes
the way `THEME RIDE:` is folded, or listing them under a "Seasonal" subheading.

### Low findings: notes

- **L2.** The preset chips are the first thing a new day row shows. Without "6–9 AM" on them, MIDDAY is a guess until tapped. Round 3 renames it LUNCH, which makes the times even more useful. After a reload the When session memory is empty, so `lastTouchedDay` falls back to the last selected weekday. In x:l01 that's an "Any time" Wednesday, and the helper offers "APPLY WED'S TIMES TO MON", which would erase Monday's two ranges.
- **L5.** In x:z04 booking opens Wed 5:00 AM, yet BOOK ON EQUINOX is the black button, and tapping it sends the member to a page where they can't book yet. While the state is "opens", make REMIND primary and turn BOOK into a secondary "VIEW ON EQUINOX ↗". There are no cancelled classes in today's data, but `ClassDetail` never checks `isCancelled`.
- **L6.** At 1024 px (x:d03), the 1fr booking column holds a single "OPEN", while club names wrap onto two mono lines. Black "OPEN" on every first-day row is also the heaviest repeated mark after the class name. Grey "Open" with black "Opens Tue 5 AM" would emphasize the actionable state.
- **L7.** The end time "–7:15 AM": in DM Mono the en dash is a full cell and reads as a minus. The spec's "–7:45" (no meridiem) or a lighter Inter "to 7:15" scans better. The no-matches hint for Yoga + Swim reads "Yoga runs Mon 10:00 AM, Mon 4:00 PM and Mon 5:30 PM" (x:z03). It should name both and spread across weekdays ("Mon 10 AM, Wed 6 PM, Sat 9 AM"), with a non-breaking space before AM/PM.
- **L11.** With `viewport-fit=cover` and only bottom insets used, a notched iPhone in landscape puts the monogram, filter labels and time column under the sensor housing. On slow networks the empty `#app` shows white until 78 KB of JS and five font files arrive. A static header and skeleton in `index.html` would cover that.

## Deviations from the handoff

Real deviations only. Cosmetic differences are left out.

| § | Spec | Build | Verdict |
|---|---|---|---|
| 5.2 | Three equal filter cells | 1.25 / 1 / 1 | Revert. It causes M4 |
| 5.5 | Club search gets search mode; chips collapse | No search mode; chips stay open after an in-sheet pick | Fix (M5) |
| 5.1 | Clipboard failure → sheet with a read-only URL | Toast "Couldn't share this link" | Fix (L10) |
| 8 | Dropped link *or cookie* items are noted | Link: banner line ✓; cookie: silent | Fix (M8 †) |
| 5.4 | Presets "MORNING 6–9 AM · MIDDAY 11 AM–2 PM · EVENING 5–8 PM" | Labels without times | Fix (L2) |
| 4, 9 | Shortcuts are 44 px text buttons; 44 px targets | `sm` = 36 px in several places | Fix (L1) |
| 9 | Roving tabindex on days; meta count debounced 500 ms | Arrow keys without roving; no debounce | Fix (L9) |
| 5.7 | Eyebrow adds the TZ when it differs from the device | No TZ | Fix (L4) |
| 5.2 | Collapsed Where shows its summary and "Edit"; summary beside the title | Chevron; summary only when collapsed | Minor |
| 5.6 | Mobile rows tag OPEN; end time "–7:45" | OPEN omitted on purpose (code comment: noise); "–7:45 AM" | Keep the OPEN choice and update the spec; shorten the end time |
| 5.8 | Loading shows skeleton + "Loading 12 of 43 clubs…" | Partial results render as clubs arrive | Acceptable once C1 is fixed |
| 5.8 | Eyebrow "SCHEDULES FOR 121 CLUBS · NEXT 3 WEEKS" | "117 CLUBS · THROUGH OCT 31" (clubs with classes) | The build is more honest. Update the spec |
| 5.1 | Wordmark with UNOFFICIAL tag | Tag hidden below 360 px | Keep the tag (L11) |
| 6 | Sheets animate open *and* close | Open only | Not worth fixing |

## Round-1 findings: status

| # | Round-1 issue | Status | Note |
|---|---|---|---|
| C1 | JS cookie capped at 7 days | **Fixed** | `GET ./prefs` → 204 + `Set-Cookie: eqxc=…; Max-Age=34560000; SameSite=Lax` (verified against the deploy server); re-issued on HTML too; value URL-encoded |
| H1 | Link overwrites the saved search | **Fixed** | Temporary view in `sessionStorage`, KEEP / CLEAR, ✕ on first visit, no banner when equal (shots 13, 14) |
| H2 | Per-day rows heavy | Owner override | Mitigations shipped: presets, smarter "+", parked ranges, Apply helper, Undo |
| H3 | "Empty = all" invisible | **Fixed** | "All 13 Downtown clubs" and "All Cycling classes" rows, three-state chips; leftover trap M7 † |
| H4 | Searches unusable with the keyboard | Partly | What ✓ (shot 07); club search ✗ (M5) |
| H5 | VALARM ignored by Google | **Fixed** | Event at the opening time, 15 min, `TRIGGER:PT0M`, Google link off Apple platforms |
| H6 | 320 px breaks | Partly | Bar stacks and range rows go narrow ✓; the hint breaks reflow (H3); the same clipping returns at 390 px (H2) |
| M1 | Summaries wrap mid-phrase | Fixed, but | Two clamped lines ✓; When loses its times at 390 px (M4) |
| M2 | "+" defaults, 30 min grid | **Fixed** | 15 min steps, complementary "+"; presets lack times (L2) |
| M3 | No undo | **Fixed** | Undo toasts and parked ranges; toast placement (M1) |
| M4 | Bare ↗ on rows | Owner override | Chevron + in-app detail; club first in the sub line; OPENS tag |
| M5 | Desktop rail off-screen | Mostly | Own scroll, Where collapses, booking column, anchored toast (x:s02), 720 px cap; L6 remains |
| M6 | `--fg-3` carries text | **Fixed** | All text is ≥ 5.8:1 (table below) |
| M7 | Screen-reader gaps | Mostly | Per-sheet live region, unique row names, CANCELLED tag, h2/h3, full day names; new gaps M1, M2, L9 |
| M8 | Time zones, DST, horizons | Mostly | Horizon rows, "around" near DST, TZ tags, "(3:20 AM your time)"; L4 |
| M9 | 22 open rules | Mostly | Implemented as decided; (d) is only half done (M8 †) |
| M10 | Chips crowd lists | Mostly | Collapsed block for returning users, fixed category order, all 16 cities; M5 |
| M11 | Sharing a subset or one class | Deferred | Not in the handoff; mobile Share still scrolls away with the static header |
| L1 | First-run Share, next steps | **Fixed** | Share hidden; Narrow-it-down hint |
| L2 | Targets under 44 px | Partly | L1 |
| L3 | Hierarchy polish | **Fixed** | Quiet week eyebrows, 14 px strong count, mono for data only, facts `<dl>`, MORE clamp |
| L4 | States | Mostly | Updated stamp, per-club retry, incremental rendering; M3, C1 |
| L5 | Copy | Mostly | Rewrites applied; hint logic (L7); 24-hour locale deferred |

## Framework notes

### First impression (two seconds)

- **Phone first run (shot 01).** One headline, one instruction and 16 chips sorted by size. The purpose is clear instantly, and it feels calm, premium and black-and-white.
- **Phone results (shot 09).** The eye goes from the wordmark to the bar summaries, the count, the black day rule and the first time. That's the right order. The wordmark is the heaviest element (bold 18 px caps plus a solid monogram), which is the owner's call.
- **Desktop (shot 21).** "374 CLASSES" anchors the page, and the rail reads as a panel thanks to its black right rule more than its shade.
- **Desktop first run (shot 20).** It splits attention between two identical chip sets (M6).

### Usability: the core loop on a phone

| Step | Taps | Works | Friction |
|---|---|---|---|
| Choose clubs | 2–3: city, then ALL or areas + GO | ✓ Fast, results on the next screen (shots 01–04) | Tablet popover (H1); unticking widens the search (M7 †) |
| Days and times | Days → preset → "+" → Show | ✓ Shot 05 | AM/PM clipped (H2); presets without times (L2); 3+ days still means 3+ rows (owner's model) |
| Classes | Chip or row, search | ✓ Shots 06–08; search mode pins the field | "WITHIN YOGA" label (L8) |
| Scan | Scroll | ✓ Sticky bar plus sticky day headers (shot 10) | When summary truncated (M4); list resets (C1) |
| Open detail | Tap row | ✓ Bottom sheet, facts, booking sentence (shot 12) | Closing loses position and focus (C1) |
| Book or remind | 1 tap | ✓ `.ics` on Apple; `.ics`/Google menu elsewhere (x:p02) | BOOK primary before booking opens (L5); tablet menu (H1) |

### Visual hierarchy and typography

- **390 px, light.** The row scans well: black mono start time, grey end time, the name at 15/600, then club · instructor in grey. The two sticky layers take 120 px (14% of the viewport), which is acceptable. Week dividers are now quiet eyebrows, so round-1 L3 is fixed.
- **320 px.** The stacked bar (162 px, static) and the narrow range layout work (shots 18, 19). Only H3 and the hidden UNOFFICIAL tag break it.
- **1280 px.** The proportions are balanced. On desktop rows, "OPEN" in black competes with the class name (L6). At 1024 px the club names wrap.
- **Dark (shots 16, 17, 24).** A faithful inversion: `--fg-2` is 8.6:1, and the rail's #0A0A0A against #000 reads as intended. The banner becomes the brightest object on screen (L11).
- **Type.** Inter Tight 600 caps for display, Inter for text, DM Mono for data, all OFL and self-hosted. That's disciplined. Toasts set short sentences in mono caps, which is fine at 2–4 words (round 3 makes them one line).

### Consistency

| Element | Inconsistency | Fix |
|---|---|---|
| Button heights on touch | `md` 44 vs `sm` 36 | L1 |
| Booking status in rows | Hidden on mobile, "OPEN" on desktop | Record the mobile choice in the spec; grey "Open" on desktop |
| Time formats | Rows "7:00 AM / –7:45 AM", detail "7:00–7:45 AM", bar "6–9 AM" | End time in rows "–7:45" |
| Toast placement | Anchored under Share vs bottom; bottom overlaps sheet footers; anchored overlaps the banner | M1, L10 |
| Club name | "Greenwich Avenue" (lists, detail) vs "Greenwich Ave" (rows, bar) | Fine: name vs `shortName`, and search matches both |

### Accessibility snapshot

| Pair | Ratio | Use | Verdict |
|---|---|---|---|
| `--fg-2` #5E5E5E on #FFF / rail #FAFAFA / fill #F2F2F2 | 6.48 / 6.21 / 5.79 | Secondary text | Pass |
| `--fg-2` #A6A6A6 on #000 / #0A0A0A / #161616 | 8.63 / 8.13 / 7.43 | Secondary text, dark | Pass |
| `--fg-3` #8C8C8C chip border on #FFF / #FAFAFA | 3.36 / 3.22 | Off-chip boundary | Pass (≥ 3:1) |
| `--fg-3` #6E6E6E border on #000 / #0A0A0A | 4.12 / 3.88 | Same, dark | Pass |
| `--color-panel` vs `--color-bg` | 1.04 (light), 1.06 (dark) | Rail shade | By design; the black rule separates |

- **Semantics are strong:**
  - Native checkboxes and selects.
  - `aria-pressed` on chips, including `mixed`.
  - Rows named "Beats Ride, Mon, Oct 5, 7:00 AM to 7:45 AM, Orchard St, Betty Kasper, booking open" with `aria-haspopup="dialog"`.
  - Labels like "Monday, range 1, start" and "Remove Monday 6:00 AM to 9:00 AM".
  - Inert background, a focus trap, and focus returned to the opener (when it still exists, see C1).
  - Landmarks, h1 / h2 / h3, and reduced motion zeroes every transition.
- **Gaps:** focus drops (C1, M2); the toast is outside the modal (M1); the popover doesn't contain focus, there's no skip link, and the live region is chatty (L9); the `h2` sits inside a `button` (L6); 36 px targets (L1).

## What works well (keep)

- **The first run is the fastest path in the app:** chips sorted by size, an area popover anchored to the chip with ALL and GO, and focus that starts on the first area and returns to the chip.
- **Explicit "All N … clubs/classes" rows plus three-state chips** ("Cycling · 1", "New York · 1") finally make scope visible.
- **The sticky two-line bar** with the 5 px "set" square, plus sticky day headers. It reads as a sentence and stays as context while you scroll.
- **The in-app detail is the right handoff:** facts grid, the booking sentence with "around" near DST and "(3:20 AM your time)", BOOK ON EQUINOX ↗ as the only external arrow, and a reminder that *is* the booking-open event.
- **No matches (shot 15)** still has the best microcopy, with counts on every fix.
- **Sharing and persistence are done properly:**
  - Native share with a one-sentence text.
  - `replaceState` absorption.
  - The temporary view.
  - A server-refreshed 400-day cookie.
  - An `og:image` made absolute per host (verified).
  - A good `og.png` and EC monogram.
- **Tokens are applied consistently,** dark mode comes almost free, and the code is small, readable and pure in `lib/` with tests. Most fixes above are a few lines.

## Requirements

| # | Requirement | Verdict | Notes |
|---|---|---|---|
| 1 | Works well on desktop and mobile; thoughtfully designed | Mostly | Strong at 390 and 1280 px. Tablet popovers (H1), 320 px reflow (H3), 1024 px wrap (L6), and the list reset hits every size (C1) |
| 2 | Black and white, Equinox aesthetic; open-source fonts, no Equinox IP | Yes | Inter / Inter Tight / DM Mono (OFL, `@fontsource`), original EC monogram, no Equinox assets. The bold "EQUINOX" wordmark remains the owner's trademark call |
| 3 | Multi-select city → club; cities by club count; area popover with All / Go | Mostly | Sorted 43 → 1 with alphabetical ties; popover by the chip with ALL / GO (shots 02, 03). Broken inside the tablet sheet (H1) |
| 4 | S M T W T F S multi-select | Yes | Full names, `aria-pressed`, WEEKDAYS / WEEKENDS / ALL with Undo; roving tabindex missing (L9) |
| 5 | Ranges after a day is picked; "+" for more; per-day; new day copies the last one | Yes | Rows appear per selected day, "+" adds a complementary range, days can differ, new days copy the last touched day (with parking). Fix H2 clipping; L2 fallback after reload |
| 6 | Category filter | Yes | Fixed order, zero-count categories hidden unless selected, three states. Empty section on desktop first run (M6) |
| 7 | Class-name families by prefix (Theme Ride folds, Rounds: Boxing stays), with search | Mostly | Folding and search over names, variants and categories work (shots 06–08). Seasonal one-offs unfolded (M8 †, L8); misleading "WITHIN" label in search |
| 8 | A cookie remembers the selection | Yes | `eqxc`, 400 days, URL-encoded, server re-issue verified; shared links don't overwrite it. Silent drops (M8 †) |
| 9 | Rows open the class in-app, no external arrows on rows; booking leaves only from the detail | Yes | Chevron rows open sheet / dialog / drawer; ↗ appears only on BOOK ON EQUINOX |
| 10 | URL never changes while filtering; native share with sentence, icon, preview; link absorbed; toast placed sensibly | Yes | Only `replaceState` at load. `navigator.share({title, text, url})`, apple-touch-icon / manifest / absolute `og:image`. Anchored "LINK COPIED" under Share (x:s02); it collides with the banner on phones without Web Share (L10) |
| 11 | Desktop filter pane a very slightly different shade | Yes | #FAFAFA (#0A0A0A dark), 1.04:1 against the page, with a black right rule |

## Method and evidence

- **Framework.** The design-critique framework (first impression, usability, hierarchy, consistency, accessibility), plus a check against the handoff, the round-1 findings and the 11 requirements.
- **Screenshots.** The 24 build shots, plus about 55 extra captures in the review session's scratchpad (referenced above as `x:name`; not in the repo). The scripts that made them are `qa/probe*.mjs`, which measure element rects, focus, scroll position and day-group counts, not just pixels.
- **Live checks.** Tablet 820×1180, 320 / 340 / 360 / 375 px, 1024×768, landscape 700×320, an Android UA for the reminder menu, request interception for failed and slow club files, a stubbed `navigator.share` for the copy path, and `overflow-anchor: none` to emulate browsers without scroll anchoring.
- **Concurrent edits.** At 20:48 the dev server started failing ("does not provide an export named 'tickedFamiliesIn'") because `lib/filters/*`, `FiltersContext.tsx` and about 25 UI files were being rewritten for an explicit-selection model ("owner round 3", 20:32–20:55). Live checks after that ran against a copy of the 20:31 `dist`, served locally by a copy of `deploy/server.ts`, which also confirmed `/prefs` and the absolute `og:image`.
- **Status against the in-flight source (spot-checked 21:05).**
  - Still present: C1, H1, H2, H3, M2, M3, M4, M5 and M6.
  - M1's overlap is being fixed (88 px lift); its keyboard and screen-reader reach is not.
  - Re-check M7 † and M8 † after the model change.
- **One false lead, discarded.** Full-page screenshots of the tablet dialog seemed to show no scrim. 1×1 pixel samples (#999 behind the dialog) show the scrim does paint, so it isn't reported.
