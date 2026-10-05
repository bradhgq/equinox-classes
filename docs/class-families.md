# Class families: which names fold together

The class filter lists **families**, not raw class names, so one-off titles don't flood the list.
The rules live in `shared/families.ts`. This file records the evidence behind them.

**Source:** the full download on 2026-10-04: 43,804 classes, Oct 4–31, 340 distinct names, 225 of
them shaped "Prefix: Variant" across 18 prefixes. The downloader regenerates the raw numbers
every build in `data/reports/class-names.{md,json}`.

## How to read a prefix

- **One-off titles:** the variants mostly appear in **one week** and at **one club**. Fold them
  into the prefix.
- **Stable formats:** the variants recur **every week** at many clubs. Keep each variant as its
  own entry, so "Rounds: Boxing" and "Rounds: Kickboxing" stay distinct.
- **Club labels:** the prefix is one club's tag on its own recurring formats. Strip it.

## Decisions

| Prefix | Variants | Classes | Clubs | One-week / one-club variants | Decision | Why |
|---|---:|---:|---:|---|---|---|
| THEME RIDE | 150 | 270 | 68 | 114 / 107 | **Fold → "Theme Ride"** | One-off playlists ("Charli XCX x Rufus Du Sol", "Haunted Beats", "Y2K"). All cycling. 24 have an empty title. |
| Beats + Bands Ride | 1 | 1 | 1 | 1 / 1 | **Fold → "Beats + Bands Ride"** | A themed one-off ("Rufus x ODESZA") of a standalone format (36 classes at 7 clubs). |
| W76th | 17 | 249 | **1** | 0 / 17 | **Strip → "Hot Vinyasa Yoga" etc.** | West 76th Street labels its own weekly formats. The family is the format name; search still finds "W76th". |
| Rounds | 4 | 1,214 | 90 | 0 / 0 | Keep | Boxing, Bags and Mitts, Kickboxing, Pro: distinct weekly formats. |
| True Barre | 3 | 1,758 | 106 | 0 / 0 | Keep | Bala Bangle (955), Off the Barre, Cardio. |
| Precision Walk | 3 | 802 | 77 | 0 / 1 | Keep | Elevate, Elevate + Strength, Elevate 30. |
| Swim | 3 | 303 | 19 | 0 / 0 | Keep | Pro, Skills + Drills, Basics. |
| Barefoot Sculpt | 1 | 1,316 | 117 | 0 / 0 | Keep | "The Ring" is a format. |
| Studio Dance | 13 | 305 | 39 | 0 / 4 | Keep | Dance styles (Hip Hop, Latin Rhythms, Jazz, …) that recur weekly. Even the one-club variants recur. |
| Cardio Dance | 10 | 228 | 32 | 2 / 5 | Keep | Mostly recurring (Zumba at 19 clubs, 305 Dance at 8). Revisit if one-week variants grow. |
| Intro to Equinox | 6 | 209 | 113 | 0 / 0 | Keep | Intro sessions per discipline. **The variants span categories** (Pilates, Yoga, Cycling, …), and folding would break the category filter. |
| Halloween | 5 | 185 | 78 | 5 / 0 | Keep (seasonal) | One per category (Ghost Ride, Spellbound Salutations, …). Folding across categories would break category filtering. They vanish after October. |
| Thanksgiving | 4 | 11 | 3 | 3 / 1 | Keep (seasonal) | Same reasoning as Halloween. |
| PGX, Cycle Challenge, Switch Up, The Rig, Feel Good Friday | 1 each | 4–70 | 1–9 | 0 / ≤1 | Keep | Single recurring formats. |

The 115 names without a prefix are all their own families. A handful run once ("TORCHD",
"Reformer on the Mat", "Dual Power Conditioning", all Equinox "Special_Event" classes). They sort
to the bottom of the list and are still searchable.

## Why not fold "everything seasonal"?

The app treats a class's category as its **family's** category. That way a format one club files
oddly still matches the category filter. A family that mixes categories (Halloween: one cycling
ride, one yoga flow, one barre class) would drag every member into one category. Prefixes are
folded only when their variants share a category.

## Maintaining this

After each build, skim `data/reports/class-names.md`. A prefix that is new, or whose one-week
variant count is rising, is a candidate:

- Fold it with `COLLAPSE_PREFIXES` (one-off titles, single category).
- Strip it with `STRIP_PREFIXES` (club labels).
- Then run `npm run download -- --build-only` to rebuild without calling the API.

Share links and cookies refer to family keys. Folding a prefix renames its old keys, so links
pointing at them drop those classes, with a note.
