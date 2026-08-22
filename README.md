# Logic Grid

An iOS app (React Native + Expo, TypeScript) that generates a fresh logic-grid
deduction puzzle every time you press start. You choose a **theme** and the
**shape** of the puzzle — how many sets take part and how many items each set
holds — and the app builds a puzzle around them.

Every generated puzzle is guaranteed to:

- have exactly one solution, and
- be solvable by pure deduction, so a player never has to guess.

Games in progress survive closing the app, finished games are kept, and the
statistics screen shows whether you are getting quicker.

## Running it

```bash
npm install
npm run ios        # opens the iOS simulator (needs macOS + Xcode)
npm start          # dev server; scan the QR code with Expo Go on a device
npm run web        # browser preview, handy on a machine without Xcode
```

Checks:

```bash
npm test           # jest — puzzle engine, board, storage and statistics
npm run typecheck  # tsc --noEmit
```

For a standalone build, use EAS (`npx eas build -p ios`); the bundle identifier
is set in `app.json` and should be changed to your own before building.

## How you play

1. **Home** — pick one of five themes, then set the shape on two dials:
   **sets** (3, 4 or 5 — the people plus the things they are matched with) and
   **items per set** (3 to 6). Each pair of sets gets its own grid, so three
   sets make 3 grids, four make 6 and five make 10 — twelve shapes in all, from
   a 3-of-3 warm-up to a 5-of-6 expert. "Surprise me" rolls everything.
2. **Game** — one pair-grid is shown at a time; the pills across the top switch
   between the pairs (ten of them on a five-set puzzle). Tap a square to cycle
   it blank → ✓ → ✕. Ticking a square automatically crosses out the rest of its
   row and column; the **Auto ✕** button turns that off.
3. **Clues** — tap a clue to cross it off once you have used it, or press and
   hold it to jump straight to the grid it talks about.
4. **Check** highlights any mark that contradicts the solution, **Hint** places
   one true pairing for you, and the timer stops when the last square is right.
5. **Come back later** — the board saves itself as you play, so closing the app
   mid-puzzle costs nothing. The home screen offers to resume it, with the clock
   picking up where it left off.
6. **Statistics** — solved count, time played, day streak, no-hint wins, a
   per-shape table of best and average times, a chart of recent solve times, and
   the list of recent games. Finishing a puzzle shows how that time compares
   with your earlier games of the same shape.

## Project layout

```
App.tsx                     screen switching + puzzle generation entry point
src/data/themes.ts          the five themes: categories, items, clue wording
src/data/sizes.ts           puzzle shapes: sets × items per set
src/puzzle/types.ts         puzzle, clue and theme model
src/puzzle/rng.ts           seeded PRNG (a seed always rebuilds the same puzzle)
src/puzzle/generator.ts     builds a solution, then a minimal clue set for it
src/puzzle/solver.ts        constraint solver: propagation + search
src/puzzle/describe.ts      clue objects → the sentences the player reads
src/game/board.ts           the player's ticks and crosses, hints, win check
src/game/persistence.ts     what gets written to disk, and the guards to read it
src/game/usePersistence.ts  saved game + finished games as React state
src/game/time.ts            duration formatting
src/game/useTimer.ts        elapsed-time hook
src/stats/summary.ts        history → per-size stats, streaks, improvement notes
src/storage/store.ts        the only module that touches AsyncStorage
src/components/             PairGrid, ClueList, WinOverlay, TrendChart, …
src/screens/                HomeScreen, GameScreen, StatsScreen
src/ui/                     palette, spacing, haptics helpers
```

## How the puzzle engine works

A puzzle has as many **entities** as there are items per set, and one
**category** (set) per dial position. Each entity owns exactly one item from
every category and no item is shared, so a solution is just one permutation per
category. Category 0 (the people) is pinned to the identity permutation, which
stops the same arrangement being counted twice under a relabelling of entities.

The shape is chosen on two independent dials in `src/data/sizes.ts`: `sets`
(3–5, bounded by the five categories each theme supplies) and `items` (3–6,
bounded by the six items in each of those categories). Every pair of sets is
drawn as its own grid, so `sets` decides how many grids a puzzle spans and
`items` how big each grid is. A shape's id — `4x5` for four sets of five — is
what the statistics group by.

**Generating** (`generator.ts`):

1. Sample the categories and items from the theme — always including one ordered
   category (a year, a price, a depth…) so comparison clues are possible — and
   roll a random solution.
2. Build a pool of clues that are all *true* of that solution:
   - `A is paired with B` / `A is not paired with B`
   - `A is paired with either B or C`
   - `The depth for A is deeper than for B`, optionally with an exact gap
   The pool is ordered so the interesting clue types are offered first and plain
   positive links come last.
3. Add clues one at a time until propagation alone cracks the grid.
4. Try removing every clue in turn, keeping the removal whenever the puzzle is
   still deducible. What is left is a minimal clue set.

**Solving** (`solver.ts`) keeps a candidate bitmask per (category, entity) in a
flat `Int32Array` and alternates:

- *propagation* — an item belongs to one entity and an entity to one item, plus
  one rule per clue kind, run to a fixpoint;
- *search* — branch on the most constrained cell, used by `solve()` when
  counting solutions.

Step 3 of generation deliberately uses the propagation-only entry point
(`solveByDeduction`). If pure propagation reaches a full grid, the answer is
provably unique *and* a player can reach it the same way — no guessing, no
backtracking. It is also much cheaper than proving uniqueness by exhaustive
search, which keeps generation quick: a few milliseconds for the small shapes
and around 400ms for five sets of six, the largest. `solve()` still exists for the tests, which independently confirm
that each generated puzzle has exactly one solution.

Generation is seeded: `generatePuzzle({ theme, size, seed })` always rebuilds the
same puzzle, and the seed is shown at the bottom of the game screen.

## Persistence and statistics

Two things are stored, both under AsyncStorage, both versioned:

| Key | Holds |
|-----|-------|
| `logic-grid:saved-game:v1` | the puzzle in progress: the whole puzzle, every tick and cross, crossed-off clues, elapsed seconds, hints used |
| `logic-grid:history:v1` | the last 300 finished games: time, hints, theme, shape, whether it was revealed |

The saved game stores the generated puzzle itself rather than its seed, so a
game in progress keeps playing exactly as it was even if the themes or the
generator change in a later version.

`src/storage/store.ts` is the only module that talks to AsyncStorage. Reads run
through `reviveSavedGame` / `reviveHistory` in `persistence.ts`, which validate
and, where needed, migrate: a game saved by the first build (which stored one of
four size presets and called the set count `categories`) comes back with its
shape rebuilt, and finished games recorded against the old preset ids —
`xs`, `sm`, `md`, `lg` — keep their place in the statistics under the shape ids
those presets describe. Anything that cannot be made sense of reads as "nothing
saved" instead of crashing; writes are wrapped too, so a device that refuses to write costs the
player their save and nothing more. The board is written 600ms after each
change, when the app goes to the background, and when the player leaves the
screen; finishing a puzzle clears it.

`src/stats/summary.ts` derives everything shown from the list of finished games
— nothing aggregated is stored, so the numbers can never drift out of sync with
the games behind them. Revealed puzzles are recorded but kept out of the times.
Improvement is measured two ways: `improvementFor` compares a game just
finished with earlier games at the same size (personal best, share faster than
average, rank), and `statsForSize` compares the last five solves with the five
before them for the longer-run trend the chart draws.

## Notes

- The five themes live entirely in `src/data/themes.ts`. Adding one is a matter
  of listing five categories with six items each, marking the ordered category,
  and giving each category a `pattern` used to phrase clues (`the {} mission`).
  Those five-by-six dimensions are what cap the dials at 5 sets of 6; a test
  keeps every theme honest about supplying them.
- No backend and no analytics: everything is kept on the device, and clearing
  the statistics from the stats screen deletes it.
- `react-dom` / `react-native-web` are installed only so `npm run web` can give
  a quick preview away from a Mac; nothing in the app is web-specific.
