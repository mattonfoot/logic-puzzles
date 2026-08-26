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

  describe('drawing from the pool', () => {
    const draw = (seed: number) => generatePuzzle({ theme: THEMES, size: SIZES[1], seed });

    it('picks the theme itself when handed the whole pool', () => {
      const themes = new Set(Array.from({ length: 40 }, (_, seed) => draw(seed).themeId));
      // Not proof of a fair coin, but a stuck picker would show up here.
      expect(themes.size).toBeGreaterThan(1);
      for (const id of themes) {
        expect(THEMES.some((theme) => theme.id === id)).toBe(true);
      }
    });

    it('rebuilds the same theme and cast from the same seed', () => {
      expect(draw(1234)).toEqual(draw(1234));
    });

    it('records the seed it used, and rolls a new one when not given one', () => {
      expect(draw(4321).seed).toBe(4321);

      const rolled = Array.from(
        { length: 25 },
        () => generatePuzzle({ theme: THEMES, size: SIZES[0] }).seed,
      );
      expect(new Set(rolled).size).toBe(rolled.length);
    });

    it('rebuilds a puzzle from nothing but its seed and size', () => {
      // This is what lets "resume" and "restart" hand back the same puzzle: the
      // seed, not the board, is what a puzzle really is.
      for (const size of SIZES) {
        const played = generatePuzzle({ theme: THEMES, size });
        const rebuilt = generatePuzzle({ theme: THEMES, size, seed: played.seed });
        expect(rebuilt).toEqual(played);
        expect(rebuilt.themeId).toBe(played.themeId);
        expect(rebuilt.categories).toEqual(played.categories);
        expect(rebuilt.solution).toEqual(played.solution);
      }
    });

    it('deals a different cast each time, out of the whole pool', () => {
      const theme = THEMES[0];
      const casts = new Set<string>();
      const seen = new Map<string, Set<string>>();

      for (let seed = 0; seed < 40; seed++) {
        const puzzle = generatePuzzle({ theme, size: SIZES[2], seed });
        casts.add(
          puzzle.categories.map((c) => `${c.id}:${c.items.map((i) => i.label).join()}`).join('|'),
        );
        for (const category of puzzle.categories) {
          const labels = seen.get(category.id) ?? new Set();
          category.items.forEach((item) => labels.add(item.label));
          seen.set(category.id, labels);
        }
      }

      // Practically every draw is a different line-up...
      expect(casts.size).toBeGreaterThan(35);
      // ...and over 40 draws the deeper pools are well used.
      for (const [id, labels] of seen) {
        const pool = theme.categories.find((category) => category.id === id)!;
        expect(labels.size).toBeGreaterThan(pool.items.length * 0.7);
      }
    });

    it('keeps the ordered set sorted however it was drawn', () => {
      for (let seed = 0; seed < 20; seed++) {
        const puzzle = draw(seed);
        for (const category of puzzle.categories) {
          if (!category.ordered) continue;
          const values = category.items.map((item) => item.value as number);
          expect(values).toEqual([...values].sort((a, b) => a - b));
        }
      }
    });
  });

  it('is deterministic for a given seed and different across seeds', () => {
    const options = { theme: THEMES[2], size: SIZES[2] };
    const first = generatePuzzle({ ...options, seed: 7 });
    const second = generatePuzzle({ ...options, seed: 7 });
    const other = generatePuzzle({ ...options, seed: 8 });

    expect(second).toEqual(first);
    expect(other.solution).not.toEqual(first.solution);
  });

  describe('the clue mix', () => {
    // A group clue is a cross said once about several rows, so it counts with
    // the links rather than with the flavour.
    const linkShare = (clues: { kind: string }[]) =>
      clues.filter((clue) => clue.kind === 'link' || clue.kind === 'groupNot').length /
      clues.length;

    it('leans on link clues — at least three in four, at every size', () => {
      for (const size of SIZES) {
        for (let seed = 0; seed < 30; seed++) {
          const puzzle = generatePuzzle({ theme: THEMES, size, seed });
          expect(linkShare(puzzle.clues)).toBeGreaterThanOrEqual(0.75);
        }
      }
    });

    it('still leaves room for the flavour clues', () => {
      // The floor is a floor, not a ban: comparisons and either-ors should
      // still turn up across a run of puzzles.
      const kinds = new Set<string>();
      for (let seed = 0; seed < 30; seed++) {
        for (const clue of generatePuzzle({ theme: THEMES, size: SIZES[2], seed }).clues) {
          kinds.add(clue.kind);
        }
      }
      expect(kinds).toEqual(new Set(['link', 'either', 'compare', 'groupNot']));
    });
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
        expect(text).not.toContain('{');
        expect(text).not.toContain('undefined');
        expect(text.endsWith('.')).toBe(true);
        expect(text.length).toBeGreaterThan(12);
      }
    }
  });
});
