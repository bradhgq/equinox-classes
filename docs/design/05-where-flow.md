# Where, rethought: clubs are the only thing you pick

Status: built 2026-10-05 · owner round 6 · revised after `06-critique.md` (see the end) · supersedes the Where parts of `03-handoff.md` §5.3

## Why

Owner, testing on a phone:

> on first load, it shouldn't automatically offer to load everything; that will be bad for
> performance very quick. instead of all-selecting when chosen a city, maybe none-selecting them
> and have users choose individual clubs they care about or do explicitly choose to select all in a
> region? maybe the sub-city popup doesn't use checkmarks which would be misleading. maybe rethink
> the whole flow

What was wrong with the old flow:

- **A city tap was a big, silent selection.** Tapping Boston ticked all 5 clubs. Tapping New York
  opened the area popover, and its "All" ticked 42. Each ticked club is a schedule file to fetch
  (about 125 KB raw, 17 KB gzipped). The common first move, picking your city, fetched the most data.
- **The area popover used checkboxes for something that wasn't a club pick.** A ticked "Downtown"
  meant "select 13 clubs", easy to misread as "show me Downtown". The dash state ("keep what you
  picked") needed explaining.
- **Members think in clubs, not cities.** Most go to one to three clubs, and they know their names.

## Principles

1. **Clubs are the only thing you pick.** Checkboxes appear on clubs and nowhere else in Where.
   Cities and areas help you find clubs; they are never a selection themselves.
2. **Nothing loads until you pick a club, and each pick loads just that club.**
3. **Picking a whole area or city is allowed, but explicit, and shows its size:** "Select all 13".
4. **Search first.** Typing a club's name is the fastest path for people who know it.

## The flow

### First run (no clubs yet)

The hero keeps its headline ("Equinox classes that fit.") and subtitle. Under it:

- **Find your club:** a field-styled button, "Search clubs by name". It opens the Where picker
  (a sheet on phones, the rail panel on desktop) with search focused.
- **Or browse a city:** one button per city, most clubs first, with the city's club count. A tap
  opens the Where picker showing that city's clubs, **nothing ticked**.

### The Where picker (phone sheet, desktop rail panel)

Top to bottom:

1. **Search all clubs:** spans every city. Results are a flat list of club checkboxes, each with
   "City · Area" beside it. While there's a query, the browse block below is hidden.
2. **Your clubs (n):** your picks as removable chips ("Greenwich Ave ✕"), across all cities, with
   "Clear". It appears only once something is picked. Past 6 picks it shows "+n more".
3. **City:** a native select of cities ("New York · 42 clubs"). It defaults to the city where most
   of your picks are, or the biggest city when you have none. Switching cities never changes your
   picks.
4. **The city's clubs:** one section per area, or one plain section for a city without areas.
   - Each section header shows the area name and "2 of 13", plus a text action on the right:
     **"Select all 13"**, or **"Clear"** once every club in it is picked. Both offer Undo.
   - Sections fold. Ones holding picks start open; in a city with several areas the rest start
     folded, so the areas read as a short scannable list.
   - Clubs are checkbox rows: the only checkboxes in Where.

The sheet's footer is unchanged: greyed "Pick a club" until something is picked, then
"Show N classes".

### What's gone

- The area popover (`AreaPopover`) and its All / Go / Remove.
- City chips that select (`CityChips`).
- Tri-state "All" checkboxes on area headers in Where. What keeps them: there the group is a
  class category, and "All" really is the choice.
- `Filters.cities` ("cities in play"). The city on screen is view state; the filter is just clubs.

## Links and saved filters

Unchanged. `club=`, `area=` and `city=` still decode. `area=` and `city=` mean "all of these
clubs" and are still produced when a whole area or city is picked. Old links and cookies that
named a whole city still load it, because that was an explicit choice.

## Out of scope

- Location ("clubs near me"): needs a permission prompt.
- A hard cap on picked clubs. The explicit counts make the cost visible instead.

## After the critique (`06-critique.md`)

These override the flow above where they differ.

- **"Your clubs" is always there, at one height** ("None yet" when empty). Chips sit on one line
  that scrolls sideways, newest first. A whole area is one chip ("Downtown · 13"). Picking never
  moves the list under your finger (H1, M1).
- **Area headers are one line:** name, "13 clubs" / "2 of 13 picked" / "All 13 picked", chevron at
  the right. They're headings. "Select all 13 Downtown clubs" (then "Clear all 13") is the first row
  inside the open section, above the clubs it would load. A group of one has none (H2, L1, L2).
- **A city without areas is one untitled list:** the select already names it (L2).
- **Only one "Clear all":** the sheet footer or the rail header. "Your clubs" has none (M2).
- **Focus:** "Search clubs by name or area" focuses the search field: in the rail on desktop, and
  on phones with the keyboard up (a stand-in input takes focus inside the tap). A city button
  focuses the City select. Removing a chip moves focus to its neighbour (H3, L1).
- **Search:** word starts, names first, the town shown when it explains a match, NYC / LA / SF / DC /
  OC, a reason when a club has no classes, and the count announced (M3).
- **Copy:** "City or region"; "Search clubs by name or area" everywhere; city buttons carry a
  chevron and sort by the count they show (L3). Phone spacing is tighter (L4).
- **Speed, found while verifying:** a whole New York load (42 clubs) took about 28 s at phone
  latency, before and after this round. The server compressed every club file at brotli's slowest
  setting, and the page built a new date formatter for every class on every render. Both are fixed:
  the same load now settles in about 5 s, with a tenth of the script time.

