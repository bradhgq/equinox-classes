# Handoff spec: Equinox Classes v1

Status: build spec · 2026-10-04. It supersedes the round-1 spec (`01-design.md`) wherever they
differ.

Inputs:

- Round-1 spec and mock (`01-design.md`, `mock/`).
- Critique (`02-critique.md`).
- The owner's round-1 feedback:
  - Rows use a chevron that opens an in-app detail, not an external arrow.
  - Picking a city opens a subarea popover with ALL / GO.
  - The shared-search banner uses "Clear".
  - Fonts are open-source only.
  - The desktop rail is a very slightly off-white shade.
  - Share uses the native share sheet, with a share sentence, an "EC" monogram icon and a link
    preview.
  - The "link copied" toast moves.

Stack: Preact + TypeScript + Vite, CSS Modules, no UI library. Shared types and logic come from
`../shared`.

> **Round 3 (owner feedback on the build): these override the sections below.**
>
> - **Explicit selection.** What's ticked is what shows. Each area (Where) and category (What)
>   is a **foldable group**. Its header checkbox is a tri-state "All": ticked when every item is,
>   a dash when some are, empty when none are. Tapping it ticks or unticks all items, and "All"
>   can be unticked. A partly picked group starts unfolded.
> - **What's default is "Any class"** (every category). It's left out of links and cookies.
>   Clear unticks everything; with nothing picked, the sheet's button is greyed out ("Pick a
>   class") and **Select all** appears. Where with no clubs greys out to "Pick a club".
> - **The area popover** keeps partly picked areas as they are (shown with a dash) unless tapped.
> - **When:**
>   - "MON ✕" removes a day.
>   - Presets are **Morning / Lunch / Evening**: compact, equal width, always one line.
>   - The section label is just "Times".
>   - The helper reads "Copy Fri's times to all days".
> - **Toasts are one line** with short copy ("Applied Fri", "Removed Mon").
> - **Notices move to the bottom:**
>   - "Updated … from equinox.com" and the how-it-works notes (time matching, booking window,
>     unofficial / cookie) sit in the footer as small footnotes.
>   - The meta line shows only the count, plus a stale-data warning when there is one.
>   - The detail sheet has no fine print.

> **Post-build critique (`04-critique.md`) and owner round 4: also override the sections below.**
>
> - **Detail date/time line** (the sheet's eyebrow) is DM Mono 14 px in `--color-fg`, not the
>   11 px grey eyebrow. It's the fact people check first (owner round 4).
> - **Filter bar:** three equal cells. Its measured height goes to `--filterbar-sticky` (for
>   sticky day headers only), never to its own `min-height`, which used to ratchet it taller.
> - **Sheets:**
>   - Tablets center the dialog with insets and auto margins, not a transform, so popovers
>     inside line up with their anchors.
>   - Toasts render inside the open sheet, above the footer.
>   - Closing focuses the row or button that opened the sheet, found again by
>     `data-focus-key` if it re-rendered or never took focus (Safari taps).
> - **Agenda:** opening a class or the minute tick never rebuilds the list. It resets only when the
>   query changes.
> - **Loading:**
>   - The page paints a static header and skeleton from `index.html` before the JS runs.
>   - On a cold load the skeleton holds until every club lands, for 1 s at most. Clubs that
>     fail count as settled.
> - **Touch:** hover styles only under `@media (hover: hover)`; `sm` buttons are 44 px except with a
>   mouse on desktop. Side padding respects `env(safe-area-inset-*)`.
> - **Under 360 px** the header keeps UNOFFICIAL; the mark and wordmark shrink instead.
> - **Owner round 5:**
>   - The page title, the home headline and the link preview read **"Equinox classes that
>     fit"**, with the subtitle "Better filtering for the Equinox schedule."
>   - The share sentence leads with "Equinox classes that fit".
>   - Share opens the system sheet only on touch devices; desktops copy **just the link**, so
>     "Link copied" is true.
>   - Tags are 10 px.
>   - The footer's "Equinox's rule" links to equinox.com/bookingrules.

---

## 1. Overview

A schedule finder: pick **Where** (city → area → club), **When** (weekdays → time ranges per day)
and **What** (category → class), and get one agenda of matching classes over the ~3-week
horizon. Tapping a class opens its **detail inside the app**. Only "Book on Equinox ↗" leaves.
Filters persist in a cookie, and share links are short query strings absorbed on load.

Why it's shaped this way:

- Members open it repeatedly on phones, so results come first and filters are summarized.
- Booking happens on equinox.com, so we hand off at the last possible moment, with the booking
  time in hand.

## 2. Design tokens

Defined once in `web/src/styles/tokens.css` as CSS custom properties. Components reference
tokens only, never raw values.

### Color

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | `#000000` | Page, sheets, popovers, inputs |
| `--color-panel` | `#FAFAFA` | `#0A0A0A` | **Desktop filter rail only.** A barely-there shade, per the owner. Sheets and popovers stay `--color-bg` because the scrim already separates them. |
| `--color-fg` | `#000000` | `#FFFFFF` | Primary text, selected fills, strong rules, focus ring |
| `--color-fg-2` | `#5E5E5E` (6.5:1) | `#A6A6A6` (8.6:1) | **All** secondary text, placeholders, "sub for", cancelled names |
| `--color-fg-3` | `#8C8C8C` | `#6E6E6E` | Disabled controls and decorative glyphs only (the en dash in ranges, off-chip borders). **Never text.** |
| `--color-line` | `#E5E5E5` | `#242424` | Hairlines between rows. Never the only boundary of a control. |
| `--color-fill` | `#F2F2F2` | `#161616` | Hover, pressed, skeleton bars |
| `--color-inverse` | `#FFFFFF` | `#000000` | Text and icons on `--color-fg` fills |
| `--color-scrim` | `rgb(0 0 0 / .40)` | `rgb(0 0 0 / .60)` | Behind sheets, the drawer and the mobile popover |

Dark mode follows `prefers-color-scheme`.

### Typography

Fonts are self-hosted via `@fontsource/*`, all SIL OFL 1.1: **Inter Tight** (display), **Inter**
(text), **DM Mono** (data). We never use Equinox Sans or Messina Sans Mono.

| Token | Spec | Usage |
|---|---|---|
| `--font-display-xl` | Inter Tight 600 · 48/0.92 · −0.03em · UPPER | First-run headline (40 below 360 px) |
| `--font-display-lg` | Inter Tight 600 · 32/1 · −0.02em · UPPER | Empty/error headlines, desktop result count |
| `--font-display-md` | Inter Tight 600 · 20/1.05 · −0.01em · UPPER | Sheet titles, class-detail title, wordmark (18) |
| `--font-display-sm` | Inter Tight 600 · 13/1 · +0.05em · UPPER | Day headers, day labels in When, rail panel titles (15) |
| `--font-body` | Inter 400 · 15/1.45 | Descriptions, sentences |
| `--font-body-strong` | Inter 600 · 15/1.3 | Class names, filter summaries (14) |
| `--font-small` | Inter 400 · 13/1.4 | Secondary lines (club · instructor), notes |
| `--font-button` | Inter 600 · 12/1 · +0.1em · UPPER | All button labels |
| `--font-mono-time` | DM Mono 500 · 13/1.25 | Times in rows and selects |
| `--font-mono-label` | DM Mono 500 · 12/1 · +0.08em · UPPER | Information labels: tags (NEW, OPEN), club tag, counts |
| `--font-mono-eyebrow` | DM Mono 500 · 11/1 · +0.1em · UPPER | Section labels, week dividers, meta line. **11 px is the floor.** |

Mono is for eyebrows, times and counts only. Sentences are always Inter (critique L3).

### Space, size, shape, layers, motion

| Token | Value | Usage |
|---|---|---|
| `--space-1 … --space-12` | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 | 4 px grid (`--space-4` = 16) |
| `--gutter` | 16 mobile · 24 tablet · 32 desktop | Page side padding |
| `--tap` | 44px | Minimum primary target (chips, toggles, buttons, rows) |
| `--control-h` | 44px; 36px under `(pointer: fine)` and ≥ 1024 px | Chip/button height in the desktop rail |
| `--header-h` | 56 mobile · 64 desktop | |
| `--filterbar-h` | 72 | Mobile filter bar (two-line summaries) |
| `--rail-w` | 360 | Desktop rail |
| `--drawer-w` | 440 | Desktop class-detail drawer |
| `--radius` | 0 | Everywhere: square like Equinox |
| `--border` | 1px solid | |
| `--z-sticky / -popover / -scrim / -sheet / -toast` | 10 / 40 / 50 / 60 / 70 | |
| `--dur-fast / --dur-base` | 120ms / 220ms | Hover / sheets |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | |

Focus ring: `outline: 2px solid var(--color-fg); outline-offset: 2px` on `:focus-visible`, everywhere.

## 3. Layout and responsive behavior

| Breakpoint | Layout |
|---|---|
| **Mobile < 768** | Static header (56) → **sticky filter bar** (72; three cells) → meta line → agenda. Day headers stick at `top: var(--filterbar-h)`. Filters, the class detail and menus open as **bottom sheets** (top offset 40 px). |
| **Tablet 768–1023** | Mobile structure. The agenda is capped at 720 px and centered. Sheets become centered dialogs (560 wide, max-height 85vh). |
| **Desktop ≥ 1024** | Header (64) over a two-column grid: **rail** (360, `--color-panel`, sticky `top:0`, `height:100vh`, own scroll, right rule in `--color-fg`) and **results** (padding `--gutter`). The class detail opens as a **right drawer** (440) over a scrim. Max content width is 1440, centered. |
| **Narrow < 360** (container query on panels) | Time-range rows put the day label *above* the ranges, the range chip goes full width and chevrons hide. Below 340 px the filter bar stacks into three full-width rows: label left, summary right. |

Why sticky filters and a static header on mobile: the summaries are the context you scroll with,
and the wordmark isn't.

## 4. Components

Generic components live in `web/src/components/<Name>/`. Feature compositions live in
`web/src/features/…`.

| Component | Variants | Props | Notes |
|---|---|---|---|
| `Icon` | 20 (default), 16, 24 | `name`, `size` | 1.5 px stroke, square caps, `aria-hidden`. Set: share, close, plus, chevron-right, chevron-down, search, check, external, calendar, undo. |
| `Button` | primary · secondary · text · icon | `variant`, `size: md\|sm`, `icon?`, `iconAfter?`, `href?` | md = 44 h, sm = 36 h. Text variant is an underlined label with a 44 px hit area. Icon variant is 44×44. |
| `Chip` | off · on · mixed | `state`, `count?`, `onToggle` | **Three states (critique H3).** off: 1px `--color-fg-3` border. on (all): `--color-fg` fill. mixed (narrowed): 2px `--color-fg` border, label + " · N". `aria-pressed` = false / true / mixed. Height `--control-h`. |
| `CheckRow` | default · all-row | `checked`, `label`, `sublabel?`, `meta?`, `onChange` | A native checkbox, visually a 20 px square (filled with a check when on). Min height 48. The all-row label is bold ("All 13 Downtown clubs"). |
| `SectionLabel` | | `children`, `right?` | Mono eyebrow in `--color-fg-2`, 22 px above and 10 px below. |
| `SearchField` | | `value`, `placeholder`, `onInput`, `onFocusChange` | 44 h, 1px `--color-fg` border, search icon, clear button (44) when it has a value. |
| `Sheet` | bottom · dialog · drawer | `title`, `open`, `onClose`, `footer?`, `variant` (auto by breakpoint) | `role=dialog aria-modal`. Background is `inert`. Focus trap, Esc, scrim click and return focus. Scroll lock on body. |
| `Popover` | | `anchor`, `open`, `onClose`, `label` | Anchored below the trigger (flips above if needed), 300 wide (≤ viewport − 32), with a 10 px caret. Mobile adds a light scrim. Esc / outside click closes **without applying**. |
| `Toast` | bottom · anchored | `message`, `action?`, `anchor?`, `duration` | `role=status`. Anchored variant sits 8 px under its anchor, right-aligned (used for "Link copied" under Share; critique M5 and the owner's note). Bottom variant is centered, 16 px above the safe area (Undo toasts). |
| `Banner` | | `children`, `actions` | A full-width `--color-fg` bar with inverse text, `role=status`. |
| `DayToggles` | | `value: number[]`, `onToggle(day)`, `onPreset(name)` | 7 square toggles, S M T W T F S, Sunday first. `aria-label` is the full day name; `aria-pressed`. Shortcuts: WEEKDAYS · WEEKENDS · ALL, as text buttons 44 h. |
| `TimeSelect` | start · end | `value`, `min?`, `max?`, `onChange`, `label` | A native `<select>`, 15-minute options. Mono, with a chevron (hidden when narrow). |
| `RangeEditor` | | `range`, `onChange`, `onRemove`, `dayName`, `index` | `[start ▾] – [end ▾] [✕]`. The ✕ is 44 wide. |
| `Tag` | outline · solid | `children` | Mono label, 1px border, 3/5 px padding. CANCELLED uses solid. |
| `Skeleton` | row · header | | Bars in `--color-fill`. No shimmer under reduced motion. |
| `Monogram` | | `size` | The EC mark (`public/icons/icon.svg`), inline SVG. |

Feature components:

- `Header`
- `FilterBar` + `FilterButton` (mobile)
- `FilterRail` + `RailPanel` (desktop)
- `WherePanel` (`CityChips`, `AreaPopover`, `ClubList`)
- `WhenPanel` (`DayTimeRow`, `PresetChips`, `ApplyToAll`)
- `WhatPanel` (`CategoryChips`, `FamilyList`, `FamilySearch`)
- `Results` (`MetaLine`, `NarrowHint`, `WeekDivider`, `DayGroup`, `ClassRow`, `HorizonNote`, `ClubLoadError`)
- `ClassDetail`
- `FirstRun`
- `NoMatches`
- `LoadError`
- `SharedBanner`
- `ShareButton`

## 5. Screens, states and interactions

### 5.1 Header

| Element | State | Behavior |
|---|---|---|
| Wordmark | | "EQUINOX CLASSES", `--font-display-md` at 18, with a 9 px `UNOFFICIAL` outlined mono tag. An `<h1>`. |
| Share | Mobile | Icon button (44) at the far right. |
| Share | Desktop | Secondary button, sm, "SHARE", with the share icon. |
| Share | No clubs chosen (first run) | **Hidden** (critique L1). |
| Share | Tap | Builds `{url, text}` (§7). If `navigator.share` exists and `canShare({url,text})`, it opens the **native share sheet** (iOS, Android, macOS Safari, Windows). An `AbortError` is ignored. Otherwise it copies `"<text> <url>"` to the clipboard and shows the anchored toast "LINK COPIED" under the button for 2 s. If the clipboard fails, a sheet shows the URL in a read-only field. |

### 5.2 Filter bar (mobile) and rail (desktop)

**FilterButton (mobile):** three equal cells. The label is a mono eyebrow, followed by **two
deliberate lines** (critique M1): line 1 in `--font-body-strong` 14 (`--color-fg`), line 2 in
`--font-small` (`--color-fg-2`). Each line clamps to one line with an ellipsis. A filter that's
set adds a 5 px black square after the label. Tapping opens that filter's sheet.

| Filter | Empty | Line 1 | Line 2 |
|---|---|---|---|
| Where | **"Choose clubs"** in `--color-fg`, a call to action | First token | `+ <second>` if 2 tokens; `+ N more` if more; else the token's sub ("All 43 clubs") |
| When | "Any day" (`--color-fg-2`) | Day list (rules below) | "6–9 AM, 5–8 PM" when every selected day has the same ranges · "Times vary by day" · "Any time" |
| What | "Any class" (`--color-fg-2`) | First token | Same rule as Where |

**Where tokens:**

- A whole city gives `{City, "All N clubs"}`.
- A whole area gives `{Area, "N clubs"}`.
- Each ticked club gives `{shortName}`.

**What tokens:**

- A category with no classes ticked gives "All Yoga".
- Each ticked family gives its name.

**Day list:**

- All 7 days read "Every day"; Mon–Fri reads "Weekdays"; Sat + Sun reads "Weekends".
- Runs of 3 or more consecutive days use an en dash, wrapping around the week ("Fri–Sun").
- Anything else is short names separated by spaces ("Mon Wed Sat").

**RailPanel (desktop):**

- The title (`--font-display-sm` 15) has the summary next to it in `--font-small`, plus a chevron
  that collapses or expands the panel, and a text "Clear" (only when the filter is set).
- **Where starts collapsed when a location is already saved.** It shows its two-line summary and
  "Edit". When and What start expanded.
- Order: Where, When, What.
- The rail scrolls on its own (critique M5).

### 5.3 Where: city → area → club

**City chips:**

- One per city, **sorted by number of clubs, descending** (owner).
- All cities are shown, with no overflow chip.
- Chip state: off; on (whole city); mixed ("New York · 2" when 2 areas are selected, or when
  specific clubs are ticked).

| Interaction | Behavior |
|---|---|
| Tap a city **without areas** | Toggles it. Off → on: the whole city (all its clubs) joins. On or mixed → off: removes the city and its ticks, and shows an Undo toast ("Removed Boston · UNDO"). |
| Tap a city **with areas** (New York, Southern California) | Opens **AreaPopover** anchored to the chip (owner). Nothing changes until ALL or GO. |
| AreaPopover | Title "NEW YORK" with "43 clubs" (mono) underneath. One `CheckRow` per area, most clubs first: "Downtown" · "13 clubs". Rows are pre-checked from the current selection, all checked if the whole city is on. Footer: **ALL** (secondary) and **GO** (primary). |
| ALL | Selects the whole city (every area, no narrowing), closes, results update. |
| GO | Applies the checked areas: all checked = the whole city. If none are checked: GO reads **REMOVE** when the city was selected (removes it), or is disabled when it wasn't. |
| Esc / tap outside | Closes; nothing changes. |

The same chips and popover appear in **FirstRun** (§5.8), so the very first tap leads straight to
results.

**Club list** (shown once at least one city is on):

- **Search:** shown when the selected cities have more than 12 clubs. It searches every club in
  the selected cities, including areas that aren't selected. Ticking a result from an unselected
  area adds that area, narrowed to that club.
- **Groups:**
  - One per included area, or one per city when the city has no areas.
  - Heading: "DOWNTOWN · 13", or "NEW YORK — DOWNTOWN" when more than one city is selected.
  - The first row is an all-row, "All 13 Downtown clubs". It's checked when no specific club in
    the group is ticked.
  - Then one `CheckRow` per club, alphabetical, with `town` as meta when it differs from the city.
- Ticking a club narrows its group (the all-row unticks). Unticking the last club re-checks the
  all-row. Ticking the all-row clears that group's ticks.
- Clubs with `classCount = 0` are hidden unless ticked.
- **Collapsed city block:** if a city was already selected when the sheet opened, the chips
  collapse to one line, "NEW YORK · BOSTON" plus a CHANGE text button, so the club list sits near
  the top (critique M10).

**Effective clubs**, for each selected city:

- For each included area (all of them for a whole city), or the city itself when it has no areas:
  the ticked clubs in that group, or all its clubs if none are ticked.
- No effective clubs means the **FirstRun** state, never "all of Equinox".

### 5.4 When: days, then per-day time ranges

The owner's model, kept: one row per selected day, a "+" for more ranges, and per-day
differences. The critique's fixes make the common case cheap: presets, a smarter "+", undo,
and an apply-to-all helper.

```
DAYS                                    WEEKDAYS · WEEKENDS · ALL
[S][M][T][W][T][F][S]
TIMES · CLASSES STARTING BETWEEN
MON  [6:00 AM ▾ – 9:00 AM ▾ ✕]                          [+]
     [5:00 PM ▾ – 8:00 PM ▾ ✕]
WED  Any time  [MORNING] [MIDDAY] [EVENING]             [+]
                       APPLY MON'S TIMES TO WED AND SAT
New days start with the times you set most recently. A day with no times means any time.
```

| Element | Behavior |
|---|---|
| Day toggle on | Adds the day. Its ranges are, in order: **(1)** its own ranges if it was switched off earlier in this sheet session (critique M3); **(2)** a copy of the **last touched** day's ranges (owner's rule); **(3)** none ("Any time"). *Touched* = selected, or had a range added, edited or removed. |
| Day toggle off | Removes the day. Its ranges are parked for this sheet session. |
| Shortcuts | Select **exactly** those days. Tapping the shortcut that matches the current selection clears the days. New days follow the "toggle on" rule. Shows an Undo toast. |
| Times section | Hidden until at least one day is selected. Rows are in week order. |
| Empty row | "Any time" plus preset chips **MORNING 6–9 AM · MIDDAY 11 AM–2 PM · EVENING 5–8 PM** (critique M2). Tapping one creates a normal, editable range. |
| ＋ | With no ranges, adds 6:00–9:00 AM. With ranges: evening 5–8 PM if a morning range exists and no range covers 5 PM; morning 6–9 AM if no range starts before noon; otherwise the first 3 h block between 5 AM and 11 PM not covered by the union. **Disabled** when none is free. |
| Range selects | 15-minute steps. Start runs 5:00 AM–10:45 PM; end runs 5:15 AM–11:00 PM. End options at or before the start are disabled. If the start moves to or past the end, the end becomes min(start + 1 h, 11 PM). |
| ✕ | Removes that range. Removing the last one returns the row to "Any time". |
| Apply helper | Shown when 2 or more days are selected and their ranges differ. "APPLY ⟨last touched⟩'S TIMES TO ⟨other days⟩" overwrites the others' ranges and shows an Undo toast. |
| Matching | A class matches when its club-local weekday is selected (or no day is), and the day has no ranges or the class's club-local start minute is in [start, end) of any of them. Overlapping ranges union. |

### 5.5 What: category → class

- **Category chips:** a fixed order (Cycling, Yoga, Pilates, Strength, Sculpt, HIIT, Barre,
  Boxing, Dance, Running, Swim, Regeneration, Outdoor Fitness).
  - Categories with 0 classes at the effective clubs are hidden, unless selected (then they show
    "· 0").
  - State: off; on (all of it); mixed ("Cycling · 1").
  - Deselecting removes its ticked classes and shows an Undo toast.
- **Class list:**
  - With categories selected: one group per selected category ("YOGA · 14/WK"). Its first row is
    an all-row, "All Yoga classes", then its families sorted by weekly count at the effective
    clubs ("Vinyasa Yoga · 9/WK").
  - With no categories selected: groups for every category that has classes, each showing its
    top 5 and a "SHOW ALL 23" text button.
  - **Ticking a family adds its category automatically** and narrows it.
- **Search** (`FamilySearch`): matches family names, folded variant titles ("charli" → Theme
  Ride) and category names ("swim" → every Swim family). Results come in two groups: "AT YOUR
  CLUBS", then "AT OTHER CLUBS" (meta "ELSEWHERE").
- **Search mode** (critique H4): when the field has focus, it pins to the top of the sheet body,
  the chips collapse to one line ("WITHIN YOGA, CYCLING"), and the footer hides while the on-screen
  keyboard is open (`visualViewport` height < 75% of the window). Blur, clear or Done restores the
  layout. The same applies to club search.
- **Matching:** with no categories, any class matches. Otherwise the family's category must be
  selected and either that category has no ticked families or the class's family is ticked. *A
  class's category is its family's category*, so a format filed differently by one club still
  matches.
- **Weekly count:** class count over the horizon ÷ ⌈horizon days / 7⌉, rounded, "N/WK". Show
  "<1/WK" for counts below 1.

### 5.6 Results

| Element | Spec |
|---|---|
| **Meta line** (under the filter bar) | Left: the count ("37 classes", `--font-body-strong` 14). Cancelled classes aren't counted. Right: "UPDATED 2H AGO" (mono eyebrow, `--color-fg-2`). When the data is more than 24 h old it turns `--color-fg` and reads "MAY BE OUT OF DATE · UPDATED OCT 3". |
| **Narrow hint** | Shown after the first location is chosen, while When and What are both empty: "Narrow it down" plus DAYS & TIMES and CLASS TYPES (secondary sm) and ✕. Dismissal is remembered for the session. |
| **Week divider** | An `h2`, mono eyebrow, rule above: "THIS WEEK" · "NEXT WEEK" · "OCT 18 – 24" (critique L3: small). Weeks are Sunday-first, in device-local dates. |
| **Day header** | An `h3`, sticky (§3): "MONDAY, OCT 5" in `--font-display-sm`, with the count on the right ("4", visually hidden " classes"). Black rule below. |
| **ClassRow, mobile** | A `<button>`, full width, min-height 64. Grid `84px 1fr 32px`. **Col 1:** start "7:00 AM" (`--font-mono-time`), then "–7:45" (`--font-mono-label`, `--color-fg-2`), plus a TZ tag (e.g. "PT") when selected clubs span time zones. **Col 2:** name (`--font-body-strong`) and tags (NEW, UPDATED, CANCELLED, plus booking: **OPEN** when open, **OPENS 5 AM** when it opens within 24 h). The second line is `--font-small` `--color-fg-2`: "Greenwich Ave · Danielle Bernstein" when more than one club is in play, otherwise the instructor. A substitute reads "Serena Tom (sub for Michael Gervais)". **Col 3:** `chevron-right` in `--color-fg-2`: **no external arrow** (owner). Hover/pressed use `--color-fill`. |
| **ClassRow, desktop** | Grid `120px 2fr 1fr 1fr 32px`: time · class + instructor · club (mono label) · booking ("Opens Tue 5 AM" / "Open" / "") · chevron. No studio column (critique M5). |
| **Cancelled** | Shown, with the name struck through in `--color-fg-2` and a solid CANCELLED tag. Not counted. |
| **Horizon note** | A full-width row after a selected club's `lastDate`, when it ends before the list does: "HUDSON YARDS · SCHEDULE PUBLISHED THROUGH OCT 17" (mono eyebrow) (critique M8). |
| **Incremental rendering** | Render the first 4 day groups, then 4 more each time a sentinel comes within 800 px of the viewport. Sticky headers keep working because groups are real DOM in order. |
| **Started classes** | Hidden (`startDate ≤ now`), re-checked each minute. |

### 5.7 Class detail (in-app)

Variant by breakpoint: bottom sheet / centered dialog / right drawer (440). Opened by a row, it
returns focus to that row on close.

| Block | Spec |
|---|---|
| Eyebrow | "WED, OCT 7 · 7:00–7:45 AM" (mono eyebrow). Adds the TZ when it differs from the device. |
| Title | The class name, `--font-display-md`. An all-caps prefix is title-cased ("Theme Ride: Charli XCX x Rufus Du Sol"). |
| Facts | A `<dl>`, two columns: Club · Instructor (with sub) · Studio · Level · Category. |
| Description | `--font-body`, clamped to 3 lines with a MORE text button. Hidden if missing. |
| Booking | The calendar icon and an Inter sentence: "Booking opens **Tue, Oct 6 at 5:00 AM**" · "Booking is open" · "Booking opens around 6:00 AM" (with "~"/"around" when a DST change falls between the opening and the class, using the earlier candidate; critique M8). Times are club-local. The device time is added in parentheses when it differs. |
| Primary action | **BOOK ON EQUINOX ↗**: the only external-arrow affordance in the app, because it really does leave. Opens `equinox.com/groupfitness/classes/<classInstanceId>` in a new tab. |
| Secondary action | **REMIND ME TO BOOK · TUE 5:00 AM**, only while booking isn't open yet (critique H5). On iOS/macOS it downloads the `.ics` directly. Elsewhere it opens a two-item menu: "Calendar file (.ics)" · "Google Calendar". The event is **"Book: Beats Ride · Wed 7:00 AM · Greenwich Ave"**, at the booking-open moment, 15 min long, with `VALARM TRIGGER:PT0M` and the class URL in URL and DESCRIPTION. |
| Fine print | "Booking opens 26 hours before class. The reminder is a 15-minute calendar event at that moment." |

### 5.8 First run, empty, error, shared link

| State | Spec |
|---|---|
| **First run** (no effective clubs) | An eyebrow, "SCHEDULES FOR 121 CLUBS · NEXT 3 WEEKS" (from data), then the headline "FIND YOUR CLASS." (`--font-display-xl`), a sentence, and "START WITH A CITY" with the **city chips, most clubs first**. A city without areas starts results immediately. A city with areas opens the AreaPopover; ALL or GO leads to results. The filter bar shows "Choose clubs". Share is hidden. |
| **Loading** | The meta line reads "Loading 12 of 43 clubs…". Skeleton: one day header and 6 rows. The filter bar stays usable. |
| **One club failed** | An inline row at the top of the list: "HUDSON YARDS DIDN'T LOAD" + RETRY. The other clubs render. |
| **Index failed** | "COULDN'T LOAD SCHEDULES." (`--font-display-lg`), a sentence, and RETRY (primary). |
| **No matches** | "NO CLASSES MATCH." plus one quick-fix button per active constraint, each with the count it would give: "ANY TIME ON TUE · 3", "ANY DAY, ANY TIME · 18", "ANY CLASS · 41". Plus a hint that relaxes only When and lists up to three weekly slots: "Swim runs at Greenwich Ave on Tue at 8:00 PM and Wed at 10:00 AM." |
| **Shared link** | See §7. Banner text "Showing a shared search", actions **KEEP** and **CLEAR** (owner: "clear", not "undo"). A first-time visitor gets ✕ only. A second line notes dropped items ("1 club in this link isn't on the schedule anymore."). |

## 6. Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Bottom sheet | Open / close | translateY(100% → 0) + scrim fade | `--dur-base` | `--ease-out` |
| Drawer | Open / close | translateX(100% → 0) + scrim fade | `--dur-base` | `--ease-out` |
| Popover | Open | opacity 0→1, translateY(−4 → 0) | `--dur-fast` | `--ease-out` |
| Toast | Show / hide | opacity, translateY(8 → 0) | 160ms | `--ease-out` |
| Chips, toggles | Toggle | **Instant** inversion: Equinox crispness, no tween | 0 | |
| Rows, buttons | Hover | Background → `--color-fill` | `--dur-fast` | linear |

`prefers-reduced-motion: reduce` removes all transforms and transitions.

## 7. URLs, sharing and persistence

**Share link grammar.** Query on the app's own path. Params appear in this order, values sorted
as noted:

| Param | Meaning | Example |
|---|---|---|
| `city` | Whole cities | `city=boston` |
| `area` | Whole areas inside a partially selected city | `area=new-york-downtown` |
| `club` | Ticked clubs; their area/city are implied | `club=greenwich-avenue,hudson-yards` |
| `day` | Selected days, week order, `su mo tu we th fr sa` | `day=mo,we,sa` |
| `time` | The range set shared by the most selected days (ties → earliest day). `H` or `H:MM`, 24 h, comma-separated | `time=6-9,17-20` |
| `su`…`sa` | Days whose ranges differ from `time`; `any` for no ranges | `sa=9-13`, `we=any` |
| `cat` | Whole categories (no ticked classes) | `cat=yoga` |
| `class` | Family keys; their category is implied | `class=beats-ride` |

Canonicalization:

- All 7 days with no ranges equals no days.
- A city with every club ticked equals the city.
- A category with every family ticked equals the category.
- Lists sort alphabetically, except days (week order) and categories (fixed order).

**The share sentence**, one line, built from the summaries:

> "Equinox classes that fit: All Yoga and Beats Ride at Greenwich Ave and Hudson Yards on Mon, Wed
> and Sat."

Lists use "and" with at most 3 items, then "and N more". Missing parts are omitted, and all three
empty gives "Equinox classes".

**Absorbing a shared link** (critique H1 + owner):

1. Parse it, then immediately `history.replaceState(null, "", location.pathname)`.
2. With no saved filters, adopt it (write the cookie) and show the banner with ✕ only.
3. If it equals the saved filters, there's no banner.
4. Otherwise it's a **temporary view**: kept in memory and `sessionStorage` (so a reload keeps it),
   and the cookie is untouched. The banner offers **KEEP** (writes the cookie) and **CLEAR**
   (restores the saved filters). **Editing any filter counts as KEEP.** Closing the tab loses
   nothing.

**Cookie `eqxc`** (critique C1):

- The value is `encodeURIComponent(canonical query)`, with `Path=/; Max-Age=34560000;
  SameSite=Lax`, plus `Secure` on https.
- It's written 300 ms after the last change, then the app calls `GET ./prefs` (best effort). The
  server answers `204` with the same cookie in a `Set-Cookie` header, making it a real HTTP cookie
  that Safari's 7-day cap on script-set cookies doesn't touch.
- The app also calls `./prefs` once per open, which slides the expiry. The server also re-issues
  `eqxc` on HTML responses.
- On a static host without `/prefs`, the 404 is ignored and the 7-day sliding cookie still works.

## 8. Edge cases

- **Long text:**
  - Class names wrap, with no clamp in rows.
  - Summaries clamp each of their two lines with an ellipsis.
  - Club and area names wrap in lists.
  - The share sentence caps lists at 3.
- **Many results:** a whole city can mean 5,000+ rows. Incremental rendering (§5.6) handles it, and
  counts are computed off-DOM.
- **Many clubs selected:** fetch at most 6 club files concurrently, with loading progress in the
  meta line.
- **Missing data:**
  - An unknown slug or key in a link or cookie is dropped, and the drop is noted (banner line or
    toast).
  - A null instructor reads "Instructor TBA".
  - A missing description hides that block.
- **Time zones:**
  - Grouping, sorting, ranges and displayed times are all club-local.
  - Rows get a TZ tag only when the selected clubs span zones.
  - Every "now" comparison uses `startDate` (UTC).
- **DST:** booking-open is absolute minus 26 h. If a transition falls in between, show the earlier
  of the absolute and wall-clock candidates, marked "around".
- **Slow or offline:** data is fetched with `cache: "no-cache"` (ETag revalidation). The server
  sends `Cache-Control: no-cache` + ETag for `/data`, and hashed assets are immutable.
- **Schema mismatch:** an index `version` other than `SCHEMA_VERSION` shows the load-error state
  with "The schedule format changed. Reload."

## 9. Accessibility

- **Landmarks:** `header`, `nav` (filters), `main` (results), `footer`.
- **Headings:** `h1` is the wordmark; week dividers are `h2`; days are `h3`. Text is in sentence
  case in the DOM and uppercased with CSS.
- **Focus order:**
  - Mobile: header → filter bar → meta → hint → results.
  - Desktop: header → rail (Where, When, What) → results.
  - Sheets trap focus and return it to their trigger.
- **Names:**
  - Rows: "Beats Ride, Wednesday Oct 7, 7:00 to 7:45 AM, Greenwich Ave, Erin Ay", with
    `aria-haspopup="dialog"`.
  - Day toggles: full day names.
  - Selects: "Monday, range 1, start".
  - ✕: "Remove Monday 6:00 to 9:00 AM".
  - Book: "Book Beats Ride on equinox.com (opens in a new tab)".
- **Live regions:**
  - The meta count (`aria-live=polite`, 500 ms debounce).
  - **Each sheet footer gets its own polite count**, because the background is inert while a
    sheet is open (critique M7).
  - Toasts and the banner use `role=status`.
- **States:** chips use `aria-pressed` true / false / mixed; CANCELLED is a text tag, not only a
  strike-through.
- **Keyboard:** Esc closes sheets and popovers. Arrow keys move between day toggles (roving
  tabindex). Enter or Space toggles. Selects are native.
- **Targets and contrast:**
  - Targets are 44 px minimum (critique L2).
  - Text contrast is at least 4.5:1 (`--color-fg-3` is never text).
  - The layout reflows at 320 px (§3).

## 10. Implementation map

```
web/src/
  main.tsx                  mount + global styles
  App.tsx                   layout by breakpoint; wires state, data, sheets
  styles/                   tokens.css, base.css, fonts.ts
  components/<Name>/        generic UI from §4 (Name.tsx + Name.module.css)
  features/
    header/                 Header, ShareButton
    filters/                FilterBar, FilterButton, FilterRail, RailPanel, FilterSheets
    filters/where/          WherePanel, CityChips, AreaPopover, ClubList
    filters/when/           WhenPanel, DayTimeRow, PresetChips
    filters/what/           WhatPanel, CategoryChips, FamilyList
    results/                Results, MetaLine, NarrowHint, DayGroup, ClassRow, HorizonNote, states
    detail/                 ClassDetail, ReminderMenu
    share/                  SharedBanner
  state/                    filter model + reducer (pure), FiltersProvider (cookie, link), undo
  data/                     index + club loading, caching
  lib/                      pure helpers with node --test tests: time, ranges, match, codec,
                            cookie, summary, share-text, ics, booking-label
```
