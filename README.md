# Logic Grid

An iOS app (React Native + Expo, TypeScript) that generates a fresh logic-grid
deduction puzzle every time you press start. You choose two things — a **theme**
and a **grid size** — and the app builds a puzzle around them.

Every generated puzzle is guaranteed to:

- have exactly one solution, and
- be solvable by pure deduction, so a player never has to guess.

## Running it

```bash
npm install
npm run ios        # opens the iOS simulator (needs macOS + Xcode)
npm start          # dev server; scan the QR code with Expo Go on a device
npm run web        # browser preview, handy on a machine without Xcode
```

Checks:

```bash
npm test           # jest — puzzle engine and board logic
npm run typecheck  # tsc --noEmit
```

For a standalone build, use EAS (`npx eas build -p ios`); the bundle identifier
is set in `app.json` and should be changed to your own before building.

## How you play

1. **Home** — pick one of five themes and a grid size: 3 × 3 (warm-up),
   4 × 4 (classic), 5 × 4 (tricky) or 6 × 4 (expert). The first number is how
   many items each category holds, the second how many categories take part.
   "Surprise me" rolls both for you.
2. **Game** — one pair-grid is shown at a time; the pills across the top switch
   between the pairs (six of them on a four-category puzzle). Tap a square to
   cycle it blank → ✓ → ✕. Ticking a square automatically crosses out the rest
   of its row and column; the **Auto ✕** button turns that off.
3. **Clues** — tap a clue to cross it off once you have used it, or press and
   hold it to jump straight to the grid it talks about.
4. **Check** highlights any mark that contradicts the solution, **Hint** places
   one true pairing for you, and the timer stops when the last square is right.

## Project layout

```
App.tsx                     screen switching + puzzle generation entry point
src/data/themes.ts          the five themes: categories, items, clue wording
src/data/sizes.ts           the four grid sizes
src/puzzle/types.ts         puzzle, clue and theme model
src/puzzle/rng.ts           seeded PRNG (a seed always rebuilds the same puzzle)
src/puzzle/generator.ts     builds a solution, then a minimal clue set for it
src/puzzle/solver.ts        constraint solver: propagation + search
src/puzzle/describe.ts      clue objects → the sentences the player reads
src/game/board.ts           the player's ticks and crosses, hints, win check
src/game/useTimer.ts        elapsed-time hook
src/components/             PairGrid, ClueList, WinOverlay, AppButton
src/screens/                HomeScreen, GameScreen
src/ui/                     palette, spacing, haptics helpers
```

## How the puzzle engine works

A puzzle has `size` **entities** and a handful of **categories**. Each entity
owns exactly one item from every category and no item is shared, so a solution
is just one permutation per category. Category 0 (the people) is pinned to the
identity permutation, which stops the same arrangement being counted twice under
a relabelling of entities.

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
search, which keeps generation at a few hundred milliseconds even for the 6 × 4
expert grids. `solve()` still exists for the tests, which independently confirm
that each generated puzzle has exactly one solution.

Generation is seeded: `generatePuzzle({ theme, size, seed })` always rebuilds the
same puzzle, and the seed is shown at the bottom of the game screen.

## Notes

- The five themes live entirely in `src/data/themes.ts`. Adding one is a matter
  of listing five categories with six items each, marking the ordered category,
  and giving each category a `pattern` used to phrase clues (`the {} mission`).
  A theme needs at least six items per category to support the 6 × 4 grid.
- No backend, no analytics, no persistence — progress lives in component state
  for the duration of a puzzle.
- `react-dom` / `react-native-web` are installed only so `npm run web` can give
  a quick preview away from a Mac; nothing in the app is web-specific.
