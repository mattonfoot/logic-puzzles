import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { describeClue } from '../describe';
import { generatePuzzle } from '../generator';
import { contextFor, satisfiesAll, solve, solveByDeduction } from '../solver';

jest.setTimeout(120_000);

describe('generatePuzzle', () => {
  for (const size of SIZES) {
    it(`builds a solvable ${size.label} puzzle with a unique answer`, () => {
      for (const theme of THEMES) {
        const puzzle = generatePuzzle({ theme, size, seed: 4242 });
        const ctx = contextFor(puzzle.categories, size.items);

        expect(puzzle.categories).toHaveLength(size.categories);
        for (const category of puzzle.categories) {
          expect(category.items).toHaveLength(size.items);
        }

        // Every clue is true of the intended solution...
        expect(satisfiesAll(puzzle.clues, puzzle.solution, ctx)).toBe(true);
        // ...and the clues admit that solution and no other.
        const result = solve(puzzle.clues, ctx, 2);
        expect(result.count).toBe(1);
        expect(result.solution).toEqual(puzzle.solution);
      }
    });
  }

  it('can be solved by deduction alone — no guessing required', () => {
    for (const size of SIZES) {
      for (const theme of THEMES) {
        const puzzle = generatePuzzle({ theme, size, seed: 31337 });
        const ctx = contextFor(puzzle.categories, size.items);
        expect(solveByDeduction(puzzle.clues, ctx)).toEqual(puzzle.solution);
      }
    }
  });

  it('produces a minimal clue set — dropping any clue breaks the deduction', () => {
    for (const seed of [99, 100, 101]) {
      const puzzle = generatePuzzle({ theme: THEMES[1], size: SIZES[1], seed });
      const ctx = contextFor(puzzle.categories, puzzle.size.items);
      expect(puzzle.clues.length).toBeGreaterThan(2);

      for (let index = 0; index < puzzle.clues.length; index++) {
        const without = puzzle.clues.filter((_, other) => other !== index);
        expect(solveByDeduction(without, ctx)).toBeNull();
      }
    }
  });

  it('is deterministic for a given seed and different across seeds', () => {
    const options = { theme: THEMES[2], size: SIZES[2] };
    const first = generatePuzzle({ ...options, seed: 7 });
    const second = generatePuzzle({ ...options, seed: 7 });
    const other = generatePuzzle({ ...options, seed: 8 });

    expect(second).toEqual(first);
    expect(other.solution).not.toEqual(first.solution);
  });

  it('always includes an ordered category so comparison clues are possible', () => {
    for (const theme of THEMES) {
      const puzzle = generatePuzzle({ theme, size: SIZES[1], seed: 1234 });
      expect(puzzle.categories.some((category) => category.ordered)).toBe(true);
    }
  });

  it('writes clue sentences with no placeholders left behind', () => {
    for (const theme of THEMES) {
      const puzzle = generatePuzzle({ theme, size: SIZES[3], seed: 55 });
      for (const clue of puzzle.clues) {
        const text = describeClue(clue, puzzle);
        expect(text).not.toContain('{}');
        expect(text).not.toContain('undefined');
        expect(text.endsWith('.')).toBe(true);
        expect(text.length).toBeGreaterThan(12);
      }
    }
  });
});
