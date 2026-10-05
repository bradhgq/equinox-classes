# equinox-classes: design (round 1)

Status: round 1, kept for history · 2026-10-04 · Mock: [`mock/index.html`](mock/index.html)
**Superseded by [`03-handoff.md`](03-handoff.md)** wherever they differ (owner feedback + critique).

## 1. What this is

A fast, single-page schedule finder for Equinox group-fitness classes: pick clubs, days and
times, and class types, and get one clean list of matching classes over the next ~3 weeks. Each
class has a link to book it on Equinox. It works on a phone in a locker room as well as on a
laptop.

**Primary user:** an Equinox member who goes to 1–3 clubs, knows roughly when they can train
("Mon/Wed before work, Sat late morning") and wants to see the options without tapping through
Equinox's one-club, one-day screens.

**Jobs, in priority order**

1. *"What can I take this week that fits my schedule?"* Open the app and the answer is already
   there, because my filters are remembered.
2. *"When is my favorite class next?"* Filter by class name across my clubs.
3. *"Send my friend the Saturday options."* Share a link that recreates my search.
4. *"Don't let me miss booking."* Know when booking opens (26 h before) and get reminded.

## 2. Principles

1. **Answer first.** The results list is the home screen. Filters are summarized, not sprawled.
2. **Equinox restraint.** Black, white, one grey scale, uppercase display type, hairlines, square
   corners. No accent color: emphasis comes from inversion (black fill), weight and size.
3. **One rule per filter, said out loud.** Empty means "any". Every summary reads as a sentence
   fragment ("Mon, Wed · 6–9 AM").
4. **Thumb-first, keyboard-complete.** Every control is at least 44 px and reachable with one
   thumb, and every control works with a keyboard and screen reader.
5. **Honest data.** Show when the schedule was last updated, don't imply capacity we can't see,
   and say plainly that the site is unofficial.

## 3. Visual language

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#000000` | page |
| `--fg` | `#000000` | `#FFFFFF` | primary text, selected fills, strong lines |
| `--fg-2` | `#5E5E5E` (6.4:1) | `#A6A6A6` (8.6:1) | secondary text |
| `--fg-3` | `#8C8C8C` | `#6E6E6E` | disabled, placeholders, large-only text |
| `--line` | `#E5E5E5` | `#242424` | hairlines between rows |
| `--fill` | `#F4F4F4` | `#121212` | hover, pressed, skeletons |
| `--inverse-fg` | `#FFFFFF` | `#000000` | text on selected fills |

Dark mode follows `prefers-color-scheme`. It's a straight inversion, which suits a B&W system.

**Type.** Equinox's own faces (Equinox Sans, Messina Sans Mono) are licensed, so we use close open
substitutes, self-hosted:

- *Display:* **Inter Tight** 600, uppercase, −0.01em. Used for the wordmark (20), the empty-state
  headline (32–40) and day headers (13, +0.04em).
- *Text:* **Inter** 400/500/600. Class names 15/600, body 15/400, secondary 13/400.
- *Mono:* **DM Mono** 400/500. Used for times, durations, counts and eyebrow labels (11–13, +0.06em
  uppercase for eyebrows). It plays the role Messina Sans Mono plays on equinox.com.

**Shape and space.** 0 radius everywhere (Equinox buttons are square). 1 px borders. 4 px spacing
grid; 16 px mobile gutter, 32 px desktop. Content max width 1200 px.

**Icons.** Six line icons, 1.5 px stroke, 20 px: share, close, plus, arrow-up-right (external),
calendar-plus, search, plus a chevron. Icon-only buttons always have a text label for assistive
tech.

**Motion.** Sheets slide up in 200 ms with an ease-out curve, and toggles invert instantly. All
motion is dropped under `prefers-reduced-motion`.

## 4. Layout

### Mobile (< 768 px)

```
┌─────────────────────────────────┐
│ EQUINOX CLASSES  ·UNOFFICIAL  ⇪ │  header, 56 px, not sticky
├──────────┬──────────┬───────────┤
│ WHERE    │ WHEN     │ WHAT      │  filter bar, sticky, 64 px
│ Greenw…+1│ Mon, Wed │ Yoga +2   │  label (mono 11) + summary (14/500)
├──────────┴──────────┴───────────┤
│ 38 CLASSES · NEXT 3 WEEKS       │  meta line (mono 11), live region
├─────────────────────────────────┤
│ MONDAY, OCT 5            4      │  sticky day header
│ 6:30 AM  Stronger            ↗  │  class row (min 64 px)
│ 45 MIN   Isabelle Luongo · Main │
│ …                               │
├─────────────────────────────────┤
│ Updated 2 h ago · Unofficial    │  footer
└─────────────────────────────────┘
```

Each filter button opens a **bottom sheet**: full height minus 48 px, with a title, a body that
scrolls, and a sticky footer holding "Clear" and "Show 38 classes". Changes apply live behind the
sheet; the footer button just closes it and confirms the count.

### Desktop (≥ 1024 px)

A sticky **left rail** (340 px) shows the Where / When / What panels inline (the same components
the sheets use), each with its own heading and "Clear". The results sit on the right in a wider
row layout: time | class + instructor | studio | club | action. The header carries the share
button. Between 768 and 1023 px we use the mobile layout with sheets as centered 560 px dialogs.

## 5. Components and behavior

### 5.1 Header and share

- The wordmark reads "EQUINOX CLASSES" in Inter Tight, followed by a mono `UNOFFICIAL` tag. There's
  no Equinox logo and none of its fonts.
- **Share** (icon + "Share" label on desktop) builds the short link (§7):
  - On a phone, `navigator.share()` opens the native share sheet.
  - Elsewhere, the link is copied and a toast shows "Link copied".
  - If no location is chosen yet, the button is disabled.

### 5.2 Filter bar

Three equal buttons: **Where**, **When** and **What**. When a filter is empty, the button shows a
grey placeholder ("Any club", "Any day", "Any class"). When it's set, the summary is black. A
summary that doesn't fit is truncated with "+N" (e.g., "Greenwich Ave +1").

### 5.3 Where: city → club

1. **City.** A wrap of toggle chips, one per city, ordered by club count: New York, Southern
   California, Northern California, Florida, Boston, Chicago, Washington DC, Texas, London,
   Toronto, … Several can be selected.
2. **Clubs** for the selected cities, grouped under area headings (Downtown, Midtown, Uptown,
   Brooklyn, …; or the town for regions without sub-areas). Each club is a checkbox row with its
   name and a mono "~120/wk" class-count hint.
   - A search field appears above the list when the selected cities have more than 12 clubs.
   - Selected clubs float to the top under "Selected".
3. **Semantics.** A city with none of its clubs ticked means *all clubs in that city* (the row
   reads "All 44 New York clubs"). Ticking any club narrows that city to the ticked ones.
   Deselecting a city removes its clubs.

### 5.4 When: days, then per-day time ranges

The most delicate control.

```
DAYS                                  Weekdays · Weekends · All
┌───┬───┬───┬───┬───┬───┬───┐
│ S │ M │ T │ W │ T │ F │ S │   44×44 toggles, selected = black fill
└───┴───┴───┴───┴───┴───┴───┘
TIMES · CLASSES STARTING BETWEEN
MON  [ 6:00 AM ▾ – 9:00 AM ▾ ✕ ]               ＋
     [ 5:00 PM ▾ – 8:00 PM ▾ ✕ ]
WED  [ 6:00 AM ▾ – 9:00 AM ▾ ✕ ]               ＋
FRI  Any time                                  ＋
                         Use Mon's times for all days
```

**Days**

- No days selected means any day. The Times section is hidden until at least one day is selected.
- Day shortcuts: Weekdays, Weekends, All.

**Rows**

- One row per selected day, in week order (Sun → Sat, matching the toggle strip).
- A row is the day name plus zero or more range chips plus a "＋" button.
- A row with zero ranges reads "Any time".

**Range chip**

- Two native `<select>`s (start, end) in 30-minute steps from 5:00 AM to 11:00 PM, plus a remove ✕.
- Native selects give the iOS/Android wheel pickers, which suit a thumb, and are fully accessible.
- End options before the start are disabled. If the start moves past the end, the end moves to
  start + 1 h.

**Adding and removing ranges**

- **＋ on a day with no ranges** adds 6:00–9:00 AM.
- **＋ on a day with ranges** adds 3 h starting 2 h after the latest range ends (9 AM end → 11
  AM–2 PM). It's clamped to 11 PM. If there's no room, it adds the first free 3 h block of the day.
- Overlapping ranges are allowed and simply union.
- Removing the last range returns the row to "Any time".

**New day defaults.** When a day is switched on, it copies the ranges of the most recently
*touched* day that's still selected (touched = selected or edited). This follows your rule ("the
same as the last one already selected") and also covers going back to edit an earlier day first.
If no other day is selected, the new day starts at "Any time".

- Switching a day off discards its ranges. Switching it back on copies the most recently touched
  day again.

**Helper.** "Use ⟨Day⟩'s times for all days" appears only when 2+ days are selected and their
ranges differ, where ⟨Day⟩ is the most recently touched day.

**Matching.** A class matches when its weekday is selected (or none are) and its *start* time
falls in [start, end) of any range for that day (or the day has none). Classes that started
earlier today are hidden.

**Summary text** for the filter bar:

- If all selected days share the same ranges: "Mon, Wed · 6–9 AM", "Weekdays · 6–9 AM, 5–8 PM".
- If they differ: "Mon, Wed, Fri · custom times".
- Consecutive days collapse ("Mon–Fri"), and Mon–Fri reads "Weekdays".

### 5.5 What: category, then class

1. **Category.** Toggle chips for Equinox's own categories, ordered by how many classes they have
   at the chosen clubs: Cycling, Yoga, Pilates, Strength, Sculpt, HIIT, Barre, Boxing, Dance,
   Running, Swim, Regeneration (+ Outdoor Fitness when present). Categories with zero classes at
   the chosen clubs are hidden.
2. **Class.** A search field ("Search classes") above a checkbox list of *class families*:
   - **Scope.** The list shows the selected categories' families, or all families if none are
     selected, sorted by how often they run at the chosen clubs.
   - **Row.** Name, category, and a mono count ("~12 / wk").
   - **Search.** Matches family names, folded variant titles (typing "charli" finds *Theme Ride*)
     and category names (typing "swim" lists every swim class).
   - **Selected classes** pin to the top.
3. **Families, not raw names.** "Rounds: Boxing" and "Swim: Pro" are distinct, recurring formats
   and stay as their own entries. One-off titles fold into their prefix, so "THEME RIDE: Charli XCX
   x Rufus Du Sol" lists once as *Theme Ride*. The fold list is data-driven (see
   `docs/class-families.md`), and the class filter matches by family, so new theme rides are
   included automatically.
4. **Semantics.**
   - No categories and no classes selected means any class.
   - Picking a class auto-selects its category.
   - Within a selected category, ticked classes narrow it. With none ticked, the whole category
     matches. Example: Yoga (all) + Cycling: only Beats Ride.
   - Deselecting a category clears its classes.
   - A class's category is its family's category, so a format that one club files differently
     still matches.

### 5.6 Results

- An agenda list over the whole horizon, grouped by day with **sticky day headers** ("MONDAY, OCT
  5" + count). Week dividers ("NEXT WEEK", "OCT 18 – 24") help with orientation.
- There is no separate week picker: the weekday filter plus the agenda covers "this week / next
  week".

**Class row** (mobile, min 64 px):

| Column | Content |
|---|---|
| Time, 76 px | Start time ("6:30 AM", mono 13/500), duration below ("45 MIN", mono 11, grey). |
| Middle | Class name (15/600, normal case). Instructor, with "for ⟨regular⟩" when subbing, then studio (13, grey). Club short name (mono 11 uppercase) when more than one club is in play. |
| Right | ↗ icon button (44×44) linking to the class on equinox.com in a new tab. |

**Tags**

- `NEW` / `UPDATED` show as small outlined mono tags.
- `CANCELLED` strikes through the name and dims the row. Cancelled classes stay visible so people
  aren't surprised.

**Tap to expand.** Tapping anywhere but the ↗ expands the row inline:

- **Description.**
- **Facts:** level · studio · category.
- **Booking status**, worked out from `shared/booking.ts`: "Booking opens Sun, Oct 4 · 5:00 AM",
  "Booking open now", or "Started".
- **Actions:**
  - **Book on Equinox ↗** (primary; opens equinox.com's class page, where members reserve).
  - **Add to calendar** (secondary) downloads an `.ics` for the class with an alarm *when booking
    opens*.

### 5.7 States

| State | Treatment |
|---|---|
| First run (no location) | A big uppercase headline, "FIND YOUR CLASS.", with the city chips inline. Picking a city opens the Where sheet at its club list. |
| Loading | Skeleton rows (grey bars) under real day headers. The index loads first, then club files. |
| No matches | "NO CLASSES MATCH." plus one quick-fix button per active constraint ("Any time on Mon", "All Yoga classes", "Any day"), so the user doesn't have to hunt. |
| Shared link opened | A banner above the list: "Showing a shared search" with **Undo** (restores the visitor's own previous filters) and ✕. |
| Stale data (> 12 h) | The footer line turns black with "Schedule may be out of date (updated Oct 3, 9:12 AM)". |
| Load error | "COULDN'T LOAD SCHEDULES." with Retry. |

## 6. Filter rules (normative)

The effective result set is the classes that pass all of:

- **club** ∈ effective clubs (§5.3; empty means show the first-run state, never "all of Equinox")
- **weekday** ∈ selected days (empty = all), and start time within that day's ranges (none = any)
- **category / class** rules from §5.5
- **not ended:** `end > now`, in the club's time zone

## 7. URLs, sharing, cookie

**The address bar always shows `/`.** Filters live in a cookie, not the URL, so URLs never change
while the user filters.

**Share links** are short, readable query strings on `/`:

```
/?club=greenwich-avenue,hudson-yards&day=mo,we,fr&time=6-9&fr=17-20&cat=yoga&class=beats-ride
```

| Param | Meaning |
|---|---|
| `city` | City slugs whose clubs are *all* included (cities with no specific clubs ticked). |
| `club` | Club slugs. Their cities are implied. |
| `day` | `su mo tu we th fr sa`. |
| `time` | Ranges shared by every selected day. `6-9` (24 h hours), `6:30-9`, `17-20:30`; commas for several. |
| `su`…`sa` | Per-day ranges that override `time`. |
| `cat` | Category slugs. |
| `class` | Class-family keys. |

The serializer is canonical (fixed order, sorted lists, uses `time` when all days agree), so the
same search always gives the same link. Unknown values are dropped with a quiet note ("1 club in
this link no longer exists").

**Absorbing the link.** You asked whether absorbing is good practice. In general it isn't, because
it breaks bookmarking and copying from the address bar. It's the right call here, though, because
you want the URL to stay put while filtering, and the cookie makes reloads behave. On load:

1. Parse the params and back up the visitor's current filters.
2. Apply the shared filters and save them to the cookie.
3. `history.replaceState(null, "", "/")`, so no history entry is created.
4. Show the "Showing a shared search · Undo" banner.

The one risk is a shared link silently overwriting someone's saved filters. Undo addresses that.

**Cookie.**

- Name `eqxc`. The value is the same canonical query string as a share link, so there's one format.
- `Path=/; Max-Age=34560000` (400 days, the browser cap); `SameSite=Lax`; `Secure`.
- It's written 300 ms after the last change.
- The backup for Undo is a session cookie, `eqxc_prev`.
- It's a functional preference cookie with no tracking, so no consent banner is needed. The
  footer says so.

## 8. Accessibility

- Sheets are modal dialogs: focus trap, Esc to close, focus returns to the trigger.
- Day toggles are `button[aria-pressed]` with full day names as labels.
- Every `<select>` has a label ("Monday, range 1, start").
- The result count is an `aria-live="polite"` region.
- Day headers are `h2`, and rows are list items with one clear link (↗) plus a disclosure button.
- Contrast is ≥ 4.5:1 for text and ≥ 3:1 for UI borders.
- Tap targets are ≥ 44 px.
- The layout holds at 200% zoom and 320 px width.

## 9. Not in v1

- **Notifications.** Push or email for saved searches and booking openings: see
  `docs/notifications-v2.md`. v1's "Add to calendar" alarm covers "remind me when booking opens"
  with no permissions.
- **Booking inside this app.** That would need members' Equinox credentials, so we won't do it.
- **App deep links.** Equinox exposes no universal links to a class (`apis/README.md`), so the
  equinox.com class page is the target.
- Instructor filter, "near me" sorting, PWA install. These are natural next steps; the Equinox API
  already supports instructor filters.
