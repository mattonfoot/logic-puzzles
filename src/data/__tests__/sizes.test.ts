import { generatePuzzle } from '../../puzzle/generator';
import { contextFor, hasUniqueSolution, solveByDeduction } from '../../puzzle/solver';
import { SIZES, sizeById } from '../sizes';
import { THEMES } from '../themes';

/**
 * The ladder of difficulties, written down.
 *
 * Five boards, and the shape of each is the whole of what a difficulty means —
 * the word on the door is just a name for it. A step that changed both numbers
 * at once would double the board rather than stretch it, so the ladder climbs
 * one at a time and alternates which way it grows.
 */
describe('the difficulties', () => {
  const LADDER = [
    ['xs', 'Beginner', 3, 3],
    ['sm', 'Advanced', 3, 4],
    ['md', 'Expert', 4, 4],
    ['lg', 'Pro', 4, 5],
    ['xl', 'Legend', 5, 5],
  ] as const;

  it('climbs from three of each across three sets to five across five', () => {
    expect(SIZES.map((size) => size.id)).toEqual(LADDER.map(([id]) => id));
    for (const [id, difficulty, items, categories] of LADDER) {
      const size = sizeById(id);
      expect(size.difficulty).toBe(difficulty);
      expect(size.items).toBe(items);
      expect(size.categories).toBe(categories);
      // The label is the shape as the grid reads it, so it cannot drift from it.
      expect(size.label).toBe(`${items} × ${categories}`);
    }
  });

  it('adds one thing per step, and never two', () => {
    for (let step = 1; step < SIZES.length; step++) {
      const grew =
        SIZES[step].items -
        SIZES[step - 1].items +
        (SIZES[step].categories - SIZES[step - 1].categories);
      expect(grew).toBe(1);
    }
  });

  /**
   * Every theme has to be able to dress every board. A size asking for more
   * sets than a theme owns, or more of each than its sets hold, would come out
   * as a smaller puzzle wearing the wrong name.
   */
  it('is a board every theme can fill', () => {
    for (const theme of THEMES) {
      for (const size of SIZES) {
        expect(theme.categories.length).toBeGreaterThanOrEqual(size.categories);
        for (const category of theme.categories) {
          expect(category.items.length).toBeGreaterThanOrEqual(size.items);
        }
      }
    }
  });

  /** And the generator has to reach a real puzzle at the top of the ladder. */
  it('builds a solvable Legend board', () => {
    const size = sizeById('xl');
    const puzzle = generatePuzzle({ theme: THEMES, size, seed: 5 });
    expect(puzzle.solution).toHaveLength(5);
    expect(puzzle.categories).toHaveLength(5);

    const ctx = contextFor(puzzle.categories, size.items);
    expect(hasUniqueSolution(puzzle.clues, ctx)).toBe(true);
    // Reachable without guessing, which is the promise every board makes.
    expect(solveByDeduction(puzzle.clues, ctx)).not.toBeNull();
  });
});
