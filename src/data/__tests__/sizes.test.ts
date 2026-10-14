import { cluesAllowed, generatePuzzle } from '../../puzzle/generator';
import { contextFor, hasUniqueSolution, solveByDeduction } from '../../puzzle/solver';
import { SIZES, sizeById } from '../sizes';
import { THEMES } from '../themes';

/**
 * The ladder of difficulties, written down.
 *
 * Five boards, and the shape of each is the whole of what a difficulty means —
 * the word on the door is just a name for it. A step that changed both numbers
 * at once would double the board rather than stretch it, so the ladder climbs
 * one at a time, by a set while there is room for one and by an entity after.
 */
describe('the difficulties', () => {
  const LADDER = [
    ['xs', 'Beginner', 3, 3],
    ['sm', 'Advanced', 4, 3],
    ['md', 'Expert', 4, 4],
    ['lg', 'Pro', 5, 4],
    ['xl', 'Legend', 6, 4],
  ] as const;

  /** Squares on the board: a row and a column of each pair of sets. */
  const squares = (items: number, categories: number) =>
    items * items * ((categories * (categories - 1)) / 2);

  it('climbs from three of each across three sets to six across four', () => {
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

  it('grows the board every step, and never both ways at once', () => {
    for (let step = 1; step < SIZES.length; step++) {
      const was = SIZES[step - 1];
      const now = SIZES[step];
      // The board itself has to get bigger, which is what the player meets.
      // Counting squares rather than the two numbers: a set costs more than an
      // item, because every set pairs with every other one.
      expect(squares(now.items, now.categories)).toBeGreaterThan(
        squares(was.items, was.categories),
      );
      // A step that added an entity and a set at once would double the board
      // rather than stretch it. The ladder adds sets until there are four, and
      // then the entities carry the rest of the climb.
      const more = (a: number, b: number) => (a > b ? 1 : 0);
      expect(more(now.items, was.items) + more(now.categories, was.categories)).toBe(1);
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

  it('never bans the plain match, which every puzzle falls back on', () => {
    for (const size of SIZES) {
      // A size that says nothing takes every kind; one that names them has to
      // keep this one, or the generator's own fallback would put it back and
      // the config would be describing a board it does not get.
      expect(`${size.id}: ${cluesAllowed(size).join(', ')}`).toContain('link');
    }
  });

  it('refuses a board built without plain matches', () => {
    expect(() => cluesAllowed({ ...sizeById('xs'), clues: ['notLink'] })).toThrow(/plain matches/);
  });

  /** And the generator has to reach a real puzzle at the top of the ladder. */
  it('builds a solvable Legend board', () => {
    const size = sizeById('xl');
    const puzzle = generatePuzzle({ theme: THEMES, size, seed: 5 });
    expect(puzzle.solution).toHaveLength(4);
    expect(puzzle.categories).toHaveLength(4);

    const ctx = contextFor(puzzle.categories, size.items);
    expect(hasUniqueSolution(puzzle.clues, ctx)).toBe(true);
    // Reachable without guessing, which is the promise every board makes.
    expect(solveByDeduction(puzzle.clues, ctx)).not.toBeNull();
  });
});
