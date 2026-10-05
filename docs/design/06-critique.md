# equinox-classes: design critique, owner round 6

Status: review of the round-6 changes only · 2026-10-05. Spec: [`05-where-flow.md`](05-where-flow.md).
Reviewed build: the production server at 127.0.0.1:8791, with the source read alongside. Previous
critique: [`04-critique.md`](04-critique.md).

In scope: the Where flow (first run, picker, search, your picks, city select, area sections),
"Open the Equinox app" in the class detail, and the subscription sheet's copy and feed timing.

## Verdict

1. **The owner's feedback is resolved in substance.** Nothing loads until a club is picked. On first run the app fetches only `data/index.json` (78 KB, 14.5 KB compressed). Tapping a city fetches nothing. One tick fetches one club file (SoHo: 15.6 KB compressed). A whole area is an explicit "Select all 13" that shows its size, offers Undo and saves a compact `area=` link. Checkboxes appear only on clubs, and the area popover is gone.
2. **Two things in the picker still pull against the intent.** "Your clubs" grows above the list, so the list jumps under your finger: 148 px on the first pick, 304 px after a first "Select all" (H1). And "Select all N" is the loudest control in the picker, six times down the right edge, 8 px from the fold chevron (H2). The owner wants single clubs as the default and whole areas as the deliberate exception. The current visual weight says the opposite.
3. **"Search first" fails on the first tap.** On desktop, "Search clubs by name" opens the rail but leaves focus on `body`, so typing does nothing (verified at 1280 and 1024). On the iPhone the keyboard very likely won't rise, because focus is set after the tap (H3).
4. **Medium:** "Your clubs" hides picks behind an inert "+8 more", including the only pick in another city (M1). Three "Clear" buttons with two scopes share one screen (M2). Search matches fields it doesn't show and misses common shorthand (M3). The app link's visible label suggests it opens this class (M4).
5. **The other two changes are sound.** The feed puts each class at its start time, with the booking time and link in the notes (checked in the `.ics`). The app link is a sensible fallback that needs one line of copy. Neither regressed anything, and old `city=` links and saved cookies still load as before.

No Critical findings.

| Owner's words | Verdict | Evidence |
|---|---|---|
| "on first load, it shouldn't automatically offer to load everything" | Resolved | First run requests only the index. The hero offers search and city buttons, and neither picks anything (shot 01). |
| "instead of all-selecting when chosen a city, maybe none-selecting them" | Resolved | A city tap opens the picker on that city with 0 ticked and no club requests (shot 02). |
| "have users choose individual clubs they care about" | Resolved, see H1 | One tick, one file. The list jumps after the first tick. |
| "or do explicitly choose to select all in a region" | Resolved, weighted wrong (H2) | "Select all 13" loads 13 files, offers Undo and saves `area=new-york-downtown`. It is also the easiest thing on screen to hit. |
| "maybe the sub-city popup doesn't use checkmarks which would be misleading" | Resolved | No popover. The accessibility tree has checkboxes only for clubs. |
| "maybe rethink the whole flow" | Mostly | Search, then your picks, then one city by area. The search handoff (H3) and the "Your clubs" block (H1, M1) need work. |

## Findings

"Shot NN" is `qa/where/NN-*.png`, this round's captures. "x:pNN" is a capture from this review
(see [Method](#method-and-evidence)). Sizes are CSS px at 390×844 unless noted. Line numbers refer to
the reviewed source.

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| H1 | High | `where/PickedClubs.tsx:19`, `PickedClubs.module.css:7–11`, `WherePanel.tsx:48`; shots 03→04, 06; x:p01, x:p02, x:p05 | "Your clubs" appears and grows above the list. The first pick moves every row down 148 px. Each new chip row adds 52 px. A first "Select all 10" adds 304 px. The spot you just tapped then holds another club (Flatiron where High Line was) or a "Remove East 85th Street" chip, and 7 of 13 Downtown rows slide behind the footer. | Give the block a constant height: always rendered ("None yet" when empty), chips on one line that scrolls sideways, newest first. Add a "rows don't move when you pick" check to `verify-where.mjs`. |
| H2 | High | `components/FoldGroup/FoldGroup.tsx:37–42`, `FoldGroup.module.css:3,22,59`, `where/CityClubs.tsx:19–43`; shots 02, 09, 10; x:p12, x:p18 | "SELECT ALL 13" (black, underlined caps) outweighs the area name and repeats down the right edge, 8 px from the fold chevron. The header wraps to 89 px in the desktop rail (always, since the rail is 311 px wide) and to 97 px at 320. Counts and chevrons don't line up (x = 156 vs 171). "0 of 13" repeats the 13. | One non-wrapping fold button per area: name, "13 clubs" or "2 of 13 picked", chevron at the right edge. Move the bulk action into the open section as its first row ("Select all 13 Downtown clubs", then "Clear all 13"). Hide it for one-club groups. |
| H3 | High | `WherePanel.tsx:30–37`, `RailPanel.tsx:24–28`, `Sheet.tsx:54–55`, `App.tsx:94–99`; x:p12 | Desktop: the hero's "Search clubs by name" opens the rail with focus on `body`. Typing does nothing until a second click (1280 and 1024), because the focus call runs while the panel is still `hidden`. iPhone: focus is set in an effect after the tap, so the keyboard likely won't rise (needs a device check). Desktop city buttons leave focus in the hero, 13 Shift+Tabs from the clubs. | Focus `[data-autofocus]` after `RailPanel` opens. On desktop city clicks, focus the rail's City select. On phones, focus a proxy input inside the tap handler, then move focus to the sheet's field. Stop the 56 px window scroll. |
| M1 | Medium | `PickedClubs.tsx:10,18,50`; x:p05, x:p08, x:p09 | Past six chips the rest become "+8 MORE", an `<li>` you can't tap. Chips follow index order, so the only pick in another city (Dartmouth Street) is the one hidden, and so is any pick that sorts late. A whole area shows as six club chips while the bar already says "Downtown · 13 clubs". | One chip per fully picked area or city ("Downtown · 13 ✕", removes the area with Undo). Newest first. If chips still wrap, "+n more" becomes a button that expands. |
| M2 | Medium | `PickedClubs.tsx:24–30`, `FilterSheets.tsx:56–60`, `FilterRail.tsx:47`, `CityClubs.tsx:20–22`; shot 06; x:p14 | Shot 06 shows three "CLEAR"s with two scopes: Your clubs (all), Downtown (13), footer (all). The desktop rail shows two for all clubs, 144 px apart. | Drop the Clear in "Your clubs". The footer and the rail header already clear Where, as they do for When and What. Rename the area action "Clear all 13". |
| M3 | Medium | `where/ClubSearch.tsx:19–29,31`; shot 05; x:p06, x:p07 | Substring matching on name, short name, town and "City · Area", but the town is never shown: "green" finds Roslyn through Greenvale. "la" returns 12 clubs, one of them in Los Angeles. "nyc" and "sf" find nothing. Clubs with no classes ("hamptons") read "No clubs match". The result count isn't announced. | Match word starts, rank name matches first, show the town when it isn't in the name, add aliases (NYC, LA, SF, DC, OC), explain zero-class clubs, and put the count in a polite live region. |
| M4 | Medium | `detail/BookingActions.tsx:44–49,51–72`; shot 12; x:p15 | Under "Book on Equinox ↗", "Open the Equinox app" reads as "open this class in the app". It opens the app's home screen, and only the `aria-label` says so. Before booking opens it is a third action that can't help yet. It leaves the app without the ↗ that Book and Google Calendar carry. | Add a visible line: "Opens the app's home screen, not this class." Add ↗. Consider showing it only once booking is open. Test the universal link on the iPhone with and without `target="_blank"`. |
| L1 | Low | `PickedClubs.tsx:26,38–46`, `FoldGroup.tsx:37`, `WherePanel.tsx:50` | Removing a chip, or "Your clubs · Clear", drops focus to `body`. Three chips fail label-in-name ("Sports Club NY" is named "Remove Sports Club New York"). Area names, "Your clubs" and "City" aren't headings. "0 of 13" has no noun when read aloud. | Focus the next chip (else the previous, else search) after a removal. Name chips by `shortName`. Use `<h3><button>` for areas and `as="h3"` for the two labels. Read "13 clubs" or "2 of 13 picked". |
| L2 | Low | `CityClubs.tsx:43,50`; shot 09; x:p09, x:p13, x:p18 | "BOSTON" titles the only section right under "Boston · 5 clubs". One-club cities read "SEATTLE · 0 OF 1 · SELECT ALL 1". The town meta repeats the name ("Chestnut Hill · CHESTNUT HILL", Berkeley, Palo Alto, San Mateo, San Ramon). | No title for a single section. No bulk action for one club. Show the town only when the name doesn't contain it. |
| L3 | Low | `FirstRun.tsx:35–56`, `FirstRun.module.css:61–70`, `CitySelect.tsx:25`; shots 01, 08 | City buttons wear the off-chip look, which means "toggle" in What. They sort on raw counts but show visible ones ("London 3" before "Texas 4"). "City" also labels 7 regions. Search is "Search clubs by name" in the hero and "Search all clubs" in the picker. | Add `chevron-right` to the city buttons, sort on the visible count (hero and select), label it "City or region", and use one search placeholder in both places. |
| L4 | Low | `FirstRun.module.css:2,35`, `WherePanel.module.css:4`; shot 01; x:p17 | The first hero action starts at 536 px and the cities at 676 px, so on an iPhone, under Safari's bars, the cities start below the fold. At 375×667 the search field ends at 580. In the picker, 52 px separate the search field from the "City" label. | On phones: hero top padding 40 → 24 px, block margin 32 → 24 px. In sheets: panel gap 20 → 16 px, label margin 22 → 12 px. |
| L5 | Low | `subscribe/SubscribeSheet.tsx:62,65–71,102–107`; shot 13; x:p16 | "At its real time" reads like "real-time", and "real" only makes sense to someone who saw the old booking-time feed. With too many classes, the lede promises a calendar, then refuses, and three footnotes still describe it. | "Every class in this search, in your calendar at the time it starts." When there are too many, lead with the limit and hide footnotes 1–3. |

## Findings in detail

### H1 · High · Every pick moves the list under your finger

**Problem.** "Your clubs" renders only once something is picked (`PickedClubs.tsx:19`). It sits
above the City select, and its chips wrap (`PickedClubs.module.css:9`). Each time the block appears
or gains a row, everything below it moves down. Nothing compensates, at the top of the sheet or
scrolled.

**Evidence (Chrome, 390×844, x:p01 → x:p02):**
- First pick, Greenwich Avenue, sheet at the top: every Downtown row moves down 148 px. The tapped row's center goes from y = 579 to 727.
- A quick second tap where High Line was (y = 627) now hits Flatiron. Tapping the first spot again hits Brookfield Place.
- After that first pick, 7 of the 13 Downtown rows sit behind the footer (top at 775): Hudson Square through Wall Street. Before it, the list showed down to Nomad.
- A pick that starts a new chip row (the third) moves the list another 52 px. This also happens when the sheet is scrolled.
- "Select all 10" in Uptown as the first pick (x:p05): the block grows by 304 px (six chips and "+4 MORE"). The point just tapped (314, 389) now holds the "Remove East 85th Street" chip. A double tap removes a club, and its "Removed … · Undo" toast replaces "Picked all Uptown · Undo", so the bulk pick can no longer be undone in one tap.
- With picks already showing, "Select all 13" moves from y = 317 to 421 as it turns into "CLEAR" (shot 06).

Picking clubs one by one is now the main path, and the owner tests on an iPhone. The first tap in the
list is the one that moves it.

**Fix.**
1. Render "Your clubs" whenever the browse view shows, at a constant height. With no picks it reads "None yet" in `--color-fg-2` on the same 44 px line, without Clear.
2. Put the chips on one line: `.list { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }`, with `flex: none` on each item. Show them newest first (`filters.clubs` is already in pick order), so the chip you just added is the one in view. With M1's area chips the line rarely overflows.
3. Add a check to `verify-where.mjs`: tick a club at the top of the sheet, then tap "Select all", and assert that the next row's `getBoundingClientRect().y` is unchanged.

If the owner prefers wrapping chips, the fallback is manual anchoring. Measure the tapped row's top
before the update and add the difference to the sheet body's `scrollTop` in a layout effect. That
keeps the finger on target, but the new chip then appears out of view.

### H2 · High · "Select all N" is the loudest thing in the picker

**Problem.** Each area header is a fold button (name, count, chevron) followed by a text action
(`FoldGroup.tsx:37–42`). The action is black 12 px semibold caps, letter-spaced and underlined. The
area name is 13 px display caps with no tap signal of its own. The only fold signal is a grey 20 px
chevron in the middle of the row. Down the right edge, six identical underlined "SELECT ALL N" links
form the strongest column on screen (shot 02).

That inverts the owner's ask. A member who used the old flow (city, then area) will reach for
"SELECT ALL 13" to open Downtown, and load 13 schedules.

**Evidence.**
- At 390 (shot 02) the fold button ends at x = 245 and the action starts at x = 253. The chevron (x = 225–245) is 8 px from "Select all". A tap aimed at the chevron that lands a few points right picks the whole area.
- The columns are ragged: "0 OF 13" starts at x = 156 and "0 OF 9" at x = 171; the chevrons sit at x = 225 and 232. The action's width (114–121 px) decides where they go.
- The header wraps when `flex: 1 1 12rem` plus the action doesn't fit (`FoldGroup.module.css:3,22`). The desktop rail's content is 311 px wide, so every rail header wraps to 89 px, at 1280 and at 1024 (shot 09, x:p12). At 320 they are 97 px, and only 2 of 6 New York areas fit above the footer at 320×640 (3 at 320×700, shot 10).
- "0 OF 13 · SELECT ALL 13" says 13 twice, and "0 of" carries no information until there is a pick.
- One-club cities read "SEATTLE · 0 OF 1 · SELECT ALL 1" (x:p18).

**Fix.**
1. Header: one fold button that never wraps. The name and its count on the left, the chevron at the right edge, where the City select and the rail panels put theirs. Count copy: "13 clubs" with none picked, "2 of 13 picked", "All 13 picked". 52 px at every width.
2. Move the bulk action into the open section as its first row: a 44 px text button, "Select all 13 Downtown clubs", which becomes "Clear all 13" when the area is fully picked. Members then see the 13 clubs they would load before they choose to load them.
3. Hide it when a group has one club.
4. Remove `flex-wrap`, `flex: 1 1 12rem` and the `action` slot from `FoldGroup`, or keep the slot for What only.

Result: the New York area list is 6 × 53 = 318 px at every width (now 582 px at 320 and 534 px in the
rail), each header has one target, and a whole-area pick is one deliberate step away.

### H3 · High · "Search clubs by name" doesn't give you a caret on the first try

**Problem.** The field-styled button promises "tap and type". On desktop it opens the rail's Where
panel, but `WherePanel`'s effect calls `focus()` while the panel body is still `hidden`
(`WherePanel.tsx:36`). `RailPanel` opens in its own effect, which runs after the child's
(`RailPanel.tsx:24–28`), so the focus call fails silently.

On phones the sheet focuses `[data-autofocus]` in an effect after the tap (`Sheet.tsx:54–55`). Chrome
shows a caret. iOS Safari raises the keyboard only when focus is set inside the tap's own event
handler, so on the owner's iPhone the sheet will most likely open without a keyboard and need a
second tap on the field. This needs a device check.

**Evidence.**
- Desktop, 1280×800 and 1024×800, first run: after one click `document.activeElement` is `body`. The rail search is visible but not focused (x:p12). A second click focuses it.
- The click also scrolls the window 56 px (the smooth `scrollIntoView` in `RailPanel`), so the header slides away.
- Desktop city buttons: Enter on "Boston" shows Boston in the rail and leaves focus on the hero button. It takes 13 Shift+Tabs to reach the first Boston checkbox, and screen readers hear nothing about the rail.
- Phone, in Chrome: the search field has focus after the tap. Opening Where from the filter bar correctly doesn't autofocus (`closeSheet` clears the intent).

**Fix.**
1. Desktop: focus in `RailPanel`'s reveal effect, after the panel opens: `setOpen(true); requestAnimationFrame(() => body.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }))`. `WherePanel` already sets `data-autofocus` through `autoFocus={intent?.search}`, so drop its own focus call. Scroll the rail itself, and only when the panel is out of view, instead of the window.
2. Desktop city buttons: after `startPicking({ city })`, focus the rail's City select, so keyboard and screen-reader users land where the list changed.
3. Phone: in `FirstRun`'s click handler, synchronously focus a proxy `<input>` (16 px font, `position: fixed; opacity: 0`). That raises the keyboard inside the gesture. When the sheet mounts, focus the real field (iOS keeps the keyboard when focus moves between text fields) and remove the proxy.
4. On the iPhone, one tap should show the sheet with the keyboard up.

### M1 · Medium · "Your clubs" hides the picks you most need to see

**Problem.** After six chips the rest collapse into "+n MORE", a plain `<li>` (`PickedClubs.tsx:50`)
with no way to open it. Chips follow index order (city, area, name; line 18), not pick order. The
block exists to keep picks in other cities in view, and those are exactly the ones that end up hidden.

**Evidence.**
- `?area=new-york-downtown&club=dartmouth-street` (x:p08): six Downtown chips and "+8 MORE". Dartmouth Street, the only pick outside the city on screen, is among the hidden 8. The filter bar handles the same state better: "Downtown + Dartmouth Street". After switching the select to Boston (x:p09) it shows ticked in the list, but the chips still hide it.
- Because order is by index, a club picked after a "Select all" in an earlier area goes straight into "+n more". The chip for what you just did never appears.
- A fully picked area spends three rows on six of its clubs (shot 06), while the bar, the share sentence and the `area=` link all treat it as one thing.

**Fix.**
1. Collapse a fully picked area into one chip: "Downtown · 13 ✕", named "Remove all 13 Downtown clubs". Removing it calls `clearGroup` with Undo ("Cleared Downtown"). Do the same for a whole city without areas ("Boston · 5").
2. Order chips newest first, from `filters.clubs`.
3. With H1's single scrolling line, "+n more" isn't needed. If chips keep wrapping, make it a button, "Show all 14", that expands the list in place.

### M2 · Medium · Three "Clear" buttons, two meanings

**Problem.** Shot 06 shows "CLEAR" three times: in "Your clubs" (all clubs), in the Downtown header
(13 clubs) and in the footer (all clubs). On desktop, the rail header's "Clear" and "Your clubs ·
Clear" sit 144 px apart and do the same thing (x:p14). The same word means two scopes on one screen,
and two of them are duplicates.

**Fix.** Remove the Clear from "Your clubs" (`PickedClubs.tsx:24–30`). The sheet footer and the rail
header already clear Where, as they do for When and What. Rename the area action "Clear all 13"
(named "Clear all 13 Downtown clubs"), which pairs with "Select all 13". H2 moves both into the
section.

### M3 · Medium · Search matches what it doesn't show, and misses common shorthand

**Problem.** `ClubSearch` matches the query as a substring of the name, short name, town and
"City · Area" (`ClubSearch.tsx:26`). The sublabel shows only "City · Area" (line 21), so a town match
is invisible, and two-letter queries hit the middle of words.

**Evidence (shot 05, x:p06, x:p07):**
- "green" → Greenwich Avenue, Greenwich CT, Roslyn. Roslyn's town is Greenvale (`index.json`), and nothing on screen says so.
- "la" → 12 clubs: Brookfield Place, Downtown LA, Flatiron, Great Neck, Highland Park Dallas, La Costa, Plano, Rittenhouse, Roslyn, Westlake Village, Woodbury, Woodland Hills. Only Downtown LA is in Los Angeles. Beverly Hills, Santa Monica, West Hollywood and seven more are missing.
- "nyc" and "sf" → "No clubs match". "dc" works only because the city is named "Washington DC".
- "hamptons" and "shoreditch" → "No clubs match", although both clubs exist. They have no classes on the schedule, so `classCount > 0` hides them.
- Typing announces nothing. The "3 CLUBS" heading isn't a live region, and the footer's live count doesn't change while you search.

**Fix.**
1. Match at word starts (split on spaces and punctuation). "la" then finds "La Costa" and "Downtown LA", not "Flatiron".
2. Rank: names that start with the query, then names with a word that does, then town, area and city matches. Alphabetical within each.
3. Show the town in the sublabel when the name doesn't contain it: "Greenvale · New York · Long Island".
4. A short alias list: NYC → New York, LA → Los Angeles, SF → San Francisco, DC → Washington DC, OC → Orange County.
5. If the query names a club with no classes: "Hamptons has no classes on the schedule right now." Otherwise: "No clubs match "nyc". Try a club or neighborhood name, or clear the search to browse."
6. Put the count in `aria-live="polite"`, debounced 500 ms like the meta count (handoff §9).

### M4 · Medium · "Open the Equinox app" reads like "open this class in the app"

**Problem.** The link sits in a class's detail, right under "Book on Equinox ↗" (shot 12), so members
will expect it to open that class. It opens the app's home screen, because a class-level app link
isn't possible (`apis/README.md`, "Booking, deep links and the app"). Only the `aria-label` says so,
"Open the Equinox app (opens on its home screen)" (`BookingActions.tsx:46`). Sighted members never
see that line.

Before booking opens, it is the third of three stacked actions (x:p15), after "Remind me to book" and
"Book on Equinox", and it can't help book yet. It also leaves this app without the ↗ that Book and
Google Calendar carry.

**Fix.**
1. Under the link, in `--font-small` and `--color-fg-2`: "Opens the app's home screen, not this class." Keep the `aria-label` in step.
2. Add `iconAfter="external"`, and update handoff §5.7: ↗ marks everything that leaves this app.
3. Consider showing it only when booking is open. Before that, Remind is the action.
4. On the iPhone, test with and without the app installed. If the app opens and Safari keeps an empty tab behind, drop `target="_blank"` for this link.

The rest is right: 44 px tall and full width, coarse pointers only (`(pointer: coarse)`), so it is
hidden on desktop and shown on iPads, and the text style keeps Book primary.

### L1 · Low · Accessibility gaps in the new picker

- **Focus after removal.** The chip is the focused element and it unmounts (`PickedClubs.tsx:38–46`). With the keyboard (focus a chip, press Enter), focus lands on `body`. "Your clubs · Clear" does the same. In Chrome the next Tab still lands near the removed chip, because the browser remembers the spot, but nothing has focus and VoiceOver loses its place. Fix: before the update, choose the next chip (else the previous, else the search field), give chips `data-focus-key={"pick-" + id}` and focus the target after render.
- **Label in name (WCAG 2.5.3).** Three chips are named after the long club name: "Sports Club NY" is "Remove Sports Club New York", "Sports Club DC" is "Remove Sports Club Washington D.C.", "Highland Park TX" is "Remove Highland Park Dallas". Voice Control can't match the visible text. Use `` `Remove ${club.shortName}` `` (`PickedClubs.tsx:41`).
- **Structure.** The area names, "Your clubs" and "City" aren't headings, so VoiceOver's rotor can't jump from area to area. Wrap `FoldGroup`'s button in an `h3` (the `<h2><button>` pattern the rail panels already use), and pass `as="h3"` to the two `SectionLabel`s.
- **Counts.** The fold button reads "Downtown 0 of 13, collapsed": 0 of what. H2's copy fixes it ("13 clubs", "2 of 13 picked").

### L2 · Low · Labels that repeat or say nothing

- Cities without areas get one section titled with the city's name, right under the select: "BOSTON" under "Boston · 5 clubs", "NORTHERN CALIFORNIA" under "Northern California · 9 clubs" (x:p09, x:p13).
- One-club cities read "SEATTLE · 0 OF 1 · SELECT ALL 1" (x:p18). Michigan, Philadelphia and Vancouver are the same.
- The town meta repeats the name: `CityClubs.tsx:50` only checks `town !== city.name`. So "Chestnut Hill · CHESTNUT HILL", and in Northern California Berkeley, Palo Alto, San Mateo and San Ramon (x:p13). Twenty clubs repeat their own name this way: 5 of 9 in Northern California, 3 of 6 in Florida, 3 of 4 in Texas, every club in Connecticut, New Jersey and Michigan, plus Chestnut Hill, Bethesda and Sports Club Washington D.C. In the rail it also pushes "Sports Club San Francisco" onto two lines.

**Fix.** Render a single group without a title (the select already names the city and its count).
Hide the bulk action for one-club groups. Show the town only when the club's name doesn't contain it,
so "Beale Street · SAN FRANCISCO" stays.

### L3 · Low · First-run buttons: look, order and words

- The city buttons copy the off-state chip: 1 px `--color-fg-3` border, 44 px, mono count (`FirstRun.module.css:61–70`). In What that look means "toggle", and in the old Where it meant "select this city". Add the `chevron-right` icon that class rows use for "opens", so a city reads as a place to go rather than a choice.
- They sort on the raw club count but show the visible count, so "London 3" comes before "Texas 4" (shot 01), and New York sorts on 43 while showing 42. Sort on `visibleIds(...).length`, in the hero and in the City select.
- "City" also labels 7 regions: Florida, Texas, Connecticut, New Jersey, Michigan, Northern and Southern California. Use "City or region" for the select's label and "Or browse a city or region" in the hero.
- One search, two names: "Search clubs by name" in the hero, "Search all clubs" in the picker. Search also matches areas and towns. Use "Search clubs by name or area" in both.

### L4 · Low · Vertical space on phones

- **Hero.** The first action starts at 536 px on 390×844 (shot 01), and the city buttons at 676 px. On an iPhone, Safari's toolbars cover part of that height, so most first-time visitors see the search field and no cities until they scroll. At 375×667 the search field ends at 580 px (x:p17). Search first is the intent, so this is minor. Phone-only: hero top padding 40 → 24 px (`FirstRun.module.css:2`) and `.start` margin 32 → 24 px (line 35).
- **Picker.** 52 px separate the search field from the "City" label, and 56 px separate the chips from it (`WherePanel.module.css:4` plus `SectionLabel`'s top margin). In sheets, use a 16 px panel gap and a 12 px label margin. That saves about 30 px above the list.

### L5 · Low · Subscribe copy: one phrase and one state

- "In your calendar at its real time" (`SubscribeSheet.tsx:62`): "real time" reads like "real-time", and "its real time" only makes sense next to the old booking-time feed that members never saw. Suggested: "Every class in this search, in your calendar at the time it starts. It updates as Equinox adds classes or changes the schedule."
- Too many classes (x:p16, Downtown, 5,016 classes): the lede promises a calendar, then "5,016 CLASSES: TOO MANY FOR A CALENDAR" says no, and footnotes 1–3 describe events you can't get. When `tooMany`, lead with the limit ("Too many classes for one calendar. Narrow it down to subscribe.") and hide footnotes 1–3.

## Keep as is

- **The model.** Clubs are the only state. `toggleClub` keeps pick order, `selectGroup` adds only clubs with classes, and links stay compact: "Select all 13" saves `area=new-york-downtown`, and `city=boston` still loads all 5 clubs and reads "Boston · All 5 clubs", as the spec says.
- **Nothing loads early.** The request log shows the index on first run, nothing on a city tap or when Where opens from the bar, and one file per tick.
- **Search on top, across every city,** with "City · Area" under each result and the browse block hidden while you type. That retires round-2 M5 for good. The field is 16 px, so iOS doesn't zoom.
- **The native City select** with the pick count in each option ("Boston · 1 of 5 picked"). The system picker shows where your picks are, with no custom UI to build or test.
- **The folding rule.** Areas with picks start open and the rest start folded, so New York is six lines to scan (shot 02) and a returning visitor lands on their area (shot 11).
- **Explicit counts with Undo.** "Select all 13", then "Picked all Downtown · Undo", rendered inside the sheet as `role=status`, so it's reachable and announced.
- **The greyed "Pick a club" footer.** It says what is missing instead of offering zero results.
- **Chips as whole-chip buttons,** 44 px, named "Remove …", with an Undo toast.
- **The feed.** Each event at the class's start (Beats Ride, Tue 6:00 PM, is `DTSTART:20261006T220000Z`), the booking time and link in the notes, and no alarms. "About 7 classes a week" sets expectations, and "It keeps this search: changing your filters later won't change it" is the most useful footnote in the sheet.
- **The app link's mechanics.** Coarse pointers only, a text style that doesn't compete with Book, and an honest `aria-label`. Only the visible copy needs to catch up (M4).
- **Dark mode and tablet.** The picker inverts cleanly (shot 11). In the tablet dialog (820×1180) the headers fit on one line and the toast sits above the footer (x:p20).

## Spec check (`05-where-flow.md`)

Real deviations only.

| Spec | Build | Verdict |
|---|---|---|
| First run: the search button opens the picker "with search focused" | Desktop: not focused on the first click. Phone: focused in Chrome; keyboard unverified on iOS | Fix (H3) |
| First run: city buttons "most clubs first" | Sorted on raw counts, so London 3 comes before Texas 4 | Fix (L3) |
| "Your clubs": "Past 6 picks it shows "+n more"" | As written, but "+n more" can't be opened | Change the spec (M1) |
| Area header: name, "2 of 13", action on the right | As written; it wraps in the rail and at 320 | Change the spec (H2) |
| "Clear" in "Your clubs" | Duplicates the footer and the rail header | Change the spec (M2) |
| Search results with "City · Area" beside each club | Shown below the name | Fine |
| Footer unchanged | Unchanged | ✓ |

## Earlier findings this round touches

| # (04) | Issue | Now |
|---|---|---|
| H1 | Tablet: area popover far from its anchor | Moot for Where, since the popover is gone. The tablet picker is fine (x:p20) |
| M5 | Club search under the city chips | **Fixed.** Search comes first, and the browse block hides while you type |
| M6 | Desktop first run shows the chips twice, plus an empty section | **Fixed.** Rail Where starts collapsed; What says "Pick clubs to see class types". The new handoff problem is H3 |
| M7 † | Unticking your only club widens the search | **Fixed.** Picks are only clubs, so unticking removes |
| L9 (part) | The area popover doesn't contain focus | Moot for Where |

## Framework notes

### First impression (two seconds)

- **Phone first run (shot 01).** The headline, then a box that looks like a search field, then city buttons with counts. The order says "type your club, or browse", and browsing costs nothing. That's right.
- **Picker on New York (shot 02).** The eye goes from the search box to "New York · 42 clubs", then down the right-hand column of "SELECT ALL N". That column is the strongest pattern on screen, and the area names read as labels (H2).
- **After one pick (shot 04).** It looks settled, but the list moved 148 px to get there (H1).
- **Desktop first run (shot 08).** Calm: rail Where is one line and the hero does the asking. After a click, the change happens 400 px to the left, without focus (H3).

### Usability: the core loop on a phone

| Task | Taps | Works | Friction |
|---|---|---|---|
| Find my club by name | Search, type, tick, Show: 3 taps plus typing | ✓ Shot 05 | Likely a second tap for the keyboard (H3); unexplained town matches, missed shorthand (M3) |
| Browse a city | City, area, club, Show: 4 | ✓ Shots 02–04, 07 | The list jumps on the first tick (H1) |
| A whole area | City, Select all 13, Show: 3 | ✓ Shot 06, with Undo | The bulk action is the easiest thing to hit (H2); a second tap can remove a club (H1) |
| Returning visitor | Bar, then the picker opens on your city with picked areas open | ✓ Shot 11 | A pick in another city can hide under "+n more" (M1) |
| Remove a club | Chip ✕ or untick: 1 | ✓ Undo toast in the sheet | Focus drops (L1); two Clears for everything (M2) |
| Subscribe | Subscribe, Apple Calendar: 2 | ✓ Shot 13; feed verified | One phrase (L5) |

### Visual hierarchy

- **390, light (shots 02–06).** Quiet and disciplined: mono grey eyebrows (CITY, YOUR CLUBS), black controls, one weight per role. The two problems are emphasis (H2) and reflow (H1).
- **320 (shot 10).** No sideways scroll (`scrollWidth` 320) and no clipped names, but every area header wraps to 97 px.
- **Desktop rail (shot 09, x:p12–p14).** Headers wrap to 89 px. Desktop chips are 36 px, which is fine with a mouse.
- **Dark (shot 11).** A faithful inversion. The white chips and footer button are the brightest objects, as "on" should be.
- **Detail (shot 12, x:p15).** The app link sits as quietly as MORE, which is right for a fallback.

### Consistency

| Element | Inconsistency | Fix |
|---|---|---|
| Chevron position | Right edge in the City select and the rail panels; mid-row in area headers | H2 |
| "Clear" | Three on one screen, two scopes | M2 |
| Outlined chip look | Means "toggle" in What; means "open" for first-run cities | L3 |
| Search wording | "Search clubs by name" vs "Search all clubs" | L3 |
| ↗ | On Book and Google Calendar; missing on the app link, which also leaves | M4 |
| Where tokens | The bar collapses a full area ("Downtown · 13 clubs"); "Your clubs" lists six chips and "+7 more" | M1 |

### Accessibility snapshot

| Pair | Ratio | Use | Verdict |
|---|---|---|---|
| `--fg-2` #5E5E5E on #FFF | 6.48 | "0 of 13", "+7 more", search sublabels, hero search text | Pass |
| `--fg-2` #A6A6A6 on #000 | 8.63 | Same, dark | Pass |
| `--fg-3` #8C8C8C on #FFF | 3.36 | First-run city button border | Pass (≥ 3:1) |
| `--fg-3` #6E6E6E on #000 | 4.12 | Same, dark | Pass |
| Inverse chip text | 21 | "Your clubs" chips | Pass |

- **Targets:** fold buttons 52 px; Select all, Clear, chips, the City select, first-run buttons and the app link 44 px. "+n more" isn't a target at all (M1). The fold chevron sits 8 px from Select all (H2).
- **Names:** city buttons "Browse New York, 42 clubs"; the select "City", value "New York · 13 of 42 picked"; fold buttons "Downtown 13 of 13" with `aria-expanded`; bulk actions "Select all 13 Downtown clubs" and "Clear Downtown clubs"; chips "Remove Greenwich Avenue" (three fail label-in-name, L1); checkboxes by club name, with "City · Area" as the description in search.
- **Focus order in the sheet:** Close, search, Clear, chips, City, then each area's header, action and clubs, then the footer. Logical.
- **Live regions:** the footer's polite class count and the Undo toast inside the dialog. Missing: the search count (M3).
- **Focus management:** removal drops focus (L1); the desktop handoff never moves it (H3).

## Outside this round

Noticed, not counted.

- Desktop first run shows "CLEAR" on What next to "Pick clubs to see class types." (shot 08). Clicking it sets What to nothing, and after the first club the results read "No classes picked." Hide What's actions until a club is picked.
- The "Skip to classes" link sits outside the `inert` page wrapper (`App.tsx:120`), so it stays in the accessibility tree while a sheet is open. Move it inside the wrapper.

## Method and evidence

- **Framework.** The design-critique method (first impression, usability, hierarchy, consistency, accessibility), plus a check against `05-where-flow.md` and the owner's words.
- **Build.** The production server at http://127.0.0.1:8791/, used as it was running. Source read in `web/src/features/filters/where/`, `components/FoldGroup/`, `features/firstrun/`, `features/detail/BookingActions.tsx`, `features/subscribe/` and the files they call.
- **Screenshots.** Shots 01–13 are this round's captures from `qa/verify-where.mjs`. The x: captures are in `qa/critique-r6/`: p01 before the first pick · p02 after it · p03 three picks · p04 after Select all · p05 Select all 10 as the first pick · p06 search "nyc" · p07 search "la" · p08 returning visitors (two cities; a whole area plus Boston) · p09 switched to Boston · p10 320 first run · p11 320 Southern California · p12 desktop after the hero search (1280, 1024) · p13 desktop Northern California · p14 desktop returning visitor · p15 detail before booking opens · p16 subscribe with too many classes · p17 375×667 first run · p18 Seattle · p19 dark first run · p20 tablet picker. Both folders live in the review session's scratchpad, not in the repo.
- **Scripts.** `qa/critique-r6-probe1.mjs` to `probe9.mjs` (puppeteer-core, headless Chrome). They measure element rects before and after each pick, what sits under a tapped point afterwards (`elementFromPoint`), `document.activeElement` after each action, the accessibility tree, the tab order, club-file requests and their sizes, the `eqxc` cookie, and the `.ics` feed.
- **Sizes.** Phone 390×844 @2x with touch, 375×667, 320×640; tablet 820×1180; desktop 1280×800 and 1024×800; light and dark.
- **Limits.** Chrome only. Two claims need the owner's iPhone: whether the keyboard rises after "Search clubs by name" (H3), and how the app's universal link behaves with `target="_blank"` (M4).
