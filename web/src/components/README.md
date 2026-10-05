# components/

Generic UI, one folder per component (`Name.tsx` + `Name.module.css`). No app or data
knowledge here. Hover styles sit in `@media (hover: hover)` so taps never leave a highlight behind.

- `Banner/`: full-width black notice bar plus inverse text actions.
- `Button/`: square uppercase button (primary, secondary, text, icon). Renders `<a>` when given
  an `href`.
- `CheckRow/`: list row with a native checkbox drawn as a square (tri-state: ticked, dash for
  some, empty); `CheckBox.tsx` is the box on its own.
- `Chip/`: three-state toggle chip (off / on / mixed with a count), plus `ChipGroup`.
- `ClampedText/`: paragraph clamped to a few lines, with MORE only when it really overflows.
- `DayToggles/`: S M T W T F S toggles with arrow-key navigation.
- `EmptyState/`: big headline + sentence + stacked actions (no matches, load errors).
- `FoldGroup/`: foldable list group whose header checkbox is a tri-state "All" for its items.
- `Icon/`: the line-icon set.
- `ListGroup/`: titled group inside a checkbox list ("DOWNTOWN · 13").
- `Monogram/`: the "EC" mark, theme-aware.
- `Popover/`: small dialog anchored to its trigger. Scrolls to make room; Esc or an outside tap
  cancels.
- `RangeEditor/`: `[start ▾] – [end ▾] [✕]` for one time range.
- `SearchField/`: search input with icon and clear button.
- `SectionLabel/`: mono eyebrow above a control block, with an optional right slot.
- `Sheet/`: modal bottom sheet / dialog / right drawer with focus trap and Esc.
- `Skeleton/`: loading placeholder rows.
- `Tag/`: small mono label (NEW, UPDATED, OPENS 5 AM, solid CANCELLED).
- `TimeSelect/`: native time `<select>` (15-minute options), styled.
- `Toast/`: status message, bottom-center or anchored under an element, with an optional action.
