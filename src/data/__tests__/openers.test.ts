import { generatePuzzle } from '../../puzzle/generator';
import { SIZES } from '../sizes';
import { THEMES } from '../themes';
import { clueOpener, OPENERS } from '../openers';

const puzzle = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: 7 });

describe('clueOpener', () => {
  it('gives a clue the same opener every time it is read', () => {
    for (let index = 0; index < puzzle.clues.length; index++) {
      expect(clueOpener(puzzle, index)).toBe(clueOpener(puzzle, index));
    }
  });

  it('is decided by the seed, so the same puzzle says the same thing again', () => {
    const again = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: 7 });
    expect(clueOpener(again, 0)).toBe(clueOpener(puzzle, 0));
  });

  it('leaves no slot unfilled, whatever the theme', () => {
    for (const theme of THEMES) {
      const themed = generatePuzzle({ theme, size: SIZES[1], seed: 3 });
      for (let index = 0; index < themed.clues.length; index++) {
        expect(clueOpener(themed, index)).not.toContain('{');
      }
    }
  });

  it('speaks the theme’s own word for one of its cast', () => {
    const themed = generatePuzzle({ theme: THEMES[3], size: SIZES[1], seed: 11 });
    const noun = themed.categories[0].noun;
    const spoken = OPENERS.filter((opener) => opener.includes('{noun}')).map((opener) =>
      opener.replace('{noun}', noun),
    );
    // Every opener that names somebody names one of this theme's own.
    for (const opener of spoken) expect(opener).toContain(noun);
  });

  it('reaches more than one opener across a puzzle', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 40; index++) seen.add(clueOpener(puzzle, index));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('leads into a sentence rather than finishing one', () => {
    for (const opener of OPENERS) {
      expect(opener).not.toMatch(/[.!?]$/);
      expect(opener[0]).toBe(opener[0].toUpperCase());
    }
  });
});
