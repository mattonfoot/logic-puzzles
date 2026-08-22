# Logic Grid

An iOS app (React Native + Expo, TypeScript) that generates a fresh logic-grid
deduction puzzle every time you press start. You choose the **grid size**; the
app draws everything else — the theme, the sets in play and the cast of items —
at random.

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

1. **Home** — pick a grid size: 3 × 3 (warm-up), 4 × 4 (classic), 5 × 4 (tricky)
   or 6 × 4 (expert). The first number is how many items each category holds, the
   second how many categories take part. The theme is drawn when you press start
   — one of five settings, its sets and its cast sampled from pools of fourteen
   items each, so two puzzles rarely share a line-up. "Random size" rolls the
   shape too.
2. **Game** — the whole puzzle is drawn as one staircase of grids, the way a
   printed logic puzzle is laid out: every pair of sets meets in its own grid,
   so a four-set puzzle is a 3 × 3 arrangement holding six grids, and each grid
   is items × items. Tap a square to cycle it blank → ✓ → ✕. Ticking a square
   automatically crosses out the rest of its row and column; the **Auto ✕**
   button turns that off. The set names and item labels stay pinned while the
   grids scroll sideways, and − / + resize the squares.
3. **Clues** — tap a clue to cross it off once you have used it, or press and
   hold it to light up every row and column it talks about, across all the
   grids at once.
4. **Check** highlights any mark that contradicts the solution, **Hint** places
   one true pairing for you, and the timer stops when the last square is right.
   Finishing shows **the answer as a table**: one row per person, one column per
   set, so the whole solution reads across in a line. The first set stays pinned
   while the others scroll sideways, which keeps every heading on one line.
5. **Come back later** — the board saves itself as you play, so closing the app
   mid-puzzle costs nothing. The home screen offers to resume it, with the clock
   picking up where it left off.
6. **Statistics** — solved count, time played, day streak, no-hint wins, a
   per-size table of best and average times, a chart of recent solve times, and
   the list of recent games. Finishing a puzzle shows how that time compares
   with your earlier games at the same size.

## Project layout

```
App.tsx                     screen switching + puzzle generation entry point
src/data/themes.ts          the five themes: categories, item pools, clue wording
src/data/sizes.ts           the four grid sizes
src/puzzle/types.ts         puzzle, clue and theme model
src/puzzle/rng.ts           seeded PRNG (a seed always rebuilds the same puzzle)
src/puzzle/generator.ts     builds a solution, then a minimal clue set for it
src/puzzle/solver.ts        constraint solver: propagation + search
src/puzzle/describe.ts      clue objects → the sentences the player reads
src/game/board.ts           the player's ticks and crosses, hints, win check
src/game/layout.ts          the staircase arrangement + the answer table
src/game/persistence.ts     what gets written to disk, and the guards to read it
src/game/usePersistence.ts  saved game + finished games as React state
src/game/time.ts            duration formatting
src/game/useTimer.ts        elapsed-time hook
src/stats/summary.ts        history → per-size stats, streaks, improvement notes
src/storage/store.ts        the only module that touches AsyncStorage
src/components/             GridBoard, SolutionTable, ClueList, WinOverlay, …
src/screens/                HomeScreen, GameScreen, StatsScreen
src/ui/                     palette, spacing, haptics helpers
```

## How the board is laid out

`src/game/layout.ts` turns a set count into the classic arrangement. Sets 1…N-1
run across the top as columns; sets 0, N-1, N-2 … 2 run down the side as rows.
A block is drawn where a row set meets a column set for the first time, which
leaves the familiar staircase:

```
              Destination   Ship     Launch
   Astronaut     ■■■■       ■■■■      ■■■■
   Launch        ■■■■       ■■■■
   Ship          ■■■■
```

Four sets therefore give a 3 × 3 arrangement of six grids, three sets a 2 × 2
arrangement of three, and five sets a 4 × 4 arrangement of ten — every pair of
sets exactly once, which is what makes cross-referencing possible: a tick in
Astronaut × Ship can be carried into Ship × Launch without leaving the board.

`solutionRows` in the same module produces the end-of-game summary: one row per
entity and one column per set, ordered by the ordered set (earliest year,
cheapest bill…) so it reads like the answer key of a printed puzzle. The table
pins its first column and scrolls the rest, so set names never have to wrap.

## How the puzzle engine works

A puzzle has `size` **entities** and a handful of **categories**. Each entity
owns exactly one item from every category and no item is shared, so a solution
is just one permutation per category. Category 0 (the people) is pinned to the
identity permutation, which stops the same arrangement being counted twice under
a relabelling of entities.

**Generating** (`generator.ts`):

1. Draw a theme from the pool, then its categories — always including one ordered
   category (a year, a price, a depth…) so comparison clues are possible — then
   sample the items each category contributes and roll a random solution. Every
   one of those draws comes from the seeded generator, so a seed rebuilds the
   whole puzzle, cast included.
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
search, which keeps generation at a few hundred milliseconds even for the 6 × 4
expert grids. `solve()` still exists for the tests, which independently confirm
that each generated puzzle has exactly one solution.

Generation is seeded: `generatePuzzle({ theme, size, seed })` always rebuilds the
same puzzle, and the seed is shown at the bottom of the game screen.

## Persistence and statistics

Two things are stored, both under AsyncStorage, both versioned:

| Key | Holds |
|-----|-------|
| `logic-grid:saved-game:v1` | the puzzle in progress: the whole puzzle, every tick and cross, crossed-off clues, elapsed seconds, hints used |
| `logic-grid:history:v1` | the last 300 finished games: time, hints, theme, size, whether it was revealed |

The saved game stores the generated puzzle itself rather than its seed, so a
game in progress keeps playing exactly as it was even if the themes or the
generator change in a later version.

`src/storage/store.ts` is the only module that talks to AsyncStorage. Reads run
through the guards in `persistence.ts`, so data from an older version, a
half-written file, or a corrupt value reads as "nothing saved" instead of
crashing; writes are wrapped too, so a device that refuses to write costs the
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
  of listing five categories with a pool of items each, marking the ordered
  category, and giving each category a `pattern` used to phrase clues
  (`the {} mission`). The pools hold fourteen items apiece — well over the six a
  6 × 4 puzzle uses — which is what makes the draw feel fresh; a test keeps every
  pool deep, distinct and short enough to fit the grid headings.
- No backend and no analytics: everything is kept on the device, and clearing
  the statistics from the stats screen deletes it.
- `react-dom` / `react-native-web` are installed only so `npm run web` can give
  a quick preview away from a Mac; nothing in the app is web-specific.
