import { generatePuzzle } from '../../puzzle/generator';
import { briefingFor, briefingsFor } from '../briefings';
import { SIZES } from '../sizes';
import { THEMES } from '../themes';

describe('BRIEFINGS', () => {
  it('gives every theme the same number of stories to draw from', () => {
    // Not a magic number so much as a fairness one: a theme with three scenes
    // repeats itself five times as often as one with fifteen, and the repetition
    // is what a player notices rather than the count.
    const counts = THEMES.map((theme) => briefingsFor(theme.id).length);
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(new Set(counts).size).toBe(1);
  });

  it('names no set that might not be in play', () => {
    // Only the anchor is always sampled; the rest are drawn from what the theme
    // offers, so a briefing promising a cargo manifest would sometimes be
    // describing a puzzle with no cargo in it.
    for (const theme of THEMES) {
      const optional = theme.categories.slice(1);
      for (const briefing of briefingsFor(theme.id)) {
        const words = `${briefing.title} ${briefing.body}`.toLowerCase();
        for (const category of optional) {
          expect(words).not.toContain(category.name.toLowerCase());
          expect(words).not.toContain(category.noun.toLowerCase());
        }
      }
    }
  });

  it('says what happened rather than trailing off', () => {
    for (const theme of THEMES) {
      for (const briefing of briefingsFor(theme.id)) {
        expect(briefing.title.length).toBeGreaterThan(0);
        expect(briefing.body.length).toBeGreaterThan(80);
        expect(briefing.body.trim()).toMatch(/[.!?]$/);
      }
    }
  });
});

describe('briefingFor', () => {
  it('gives a puzzle the same story every time it is asked', () => {
    const puzzle = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: 12 });
    expect(briefingFor(puzzle)).toEqual(briefingFor(puzzle));
  });

  it('is decided by the seed, so the same puzzle tells the same story again', () => {
    const one = generatePuzzle({ theme: THEMES, size: SIZES[2], seed: 55 });
    const again = generatePuzzle({ theme: THEMES, size: SIZES[2], seed: 55 });
    expect(briefingFor(again)).toEqual(briefingFor(one));
  });

  it('leaves no slot unfilled, whatever the theme', () => {
    for (const theme of THEMES) {
      const puzzle = generatePuzzle({ theme, size: SIZES[1], seed: 4 });
      expect(briefingFor(puzzle).body).not.toContain('{');
    }
  });

  it('falls back rather than throwing on a theme with nothing written', () => {
    const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[0], seed: 9 });
    const orphan = { ...puzzle, themeId: 'not-a-theme' };
    expect(briefingFor(orphan).body.length).toBeGreaterThan(0);
  });

  /**
   * Every story a theme owns is one somebody will actually meet.
   *
   * A scene written and never drawn is a scene nobody proofreads, so the whole
   * set is walked rather than sampled. Two hundred and fifty games is generous:
   * the last of the thirty-three turns up by game 103, and the slack is there so
   * that writing one more does not quietly push the last one out of reach.
   */
  it('reaches every story a theme has across a run of puzzles', () => {
    for (const theme of THEMES) {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 250; seed++) {
        seen.add(briefingFor(generatePuzzle({ theme, size: SIZES[0], seed })).title);
      }
      expect(seen.size).toBe(briefingsFor(theme.id).length);
    }
  });
});
