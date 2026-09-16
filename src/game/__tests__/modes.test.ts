import {
  DAILY,
  DEFAULT_MODE,
  MODES,
  gameTitle,
  modeById,
  playedAsName,
  type ModeId,
  type PlayedAs,
} from '../modes';
import { SIZES } from '../../data/sizes';
import { modeOf, numberedSeed } from '../library';

describe('the two ways of playing', () => {
  it('offers Pure Deduction and Classic logic, and opens on the first', () => {
    expect(MODES.map((mode) => mode.id)).toEqual(['pure', 'classic']);
    expect(DEFAULT_MODE).toBe('pure');
    expect(modeById('pure').name).toBe('Pure Deduction');
    expect(modeById('classic').name).toBe('Classic logic');
  });

  /**
   * The whole of what the choice does: one side lets the board work things out
   * and the other does not. Everything else — which switches are held down,
   * which settings the game runs with — is read off this.
   */
  it('lets the board work things out on one side only', () => {
    expect(modeById('pure').assists).toBe(true);
    expect(modeById('classic').assists).toBe(false);
  });

  it('has a name and a line of its own for each', () => {
    const said = MODES.flatMap((mode) => [mode.name, mode.hint]);
    expect(new Set(said).size).toBe(said.length);
    for (const word of said) expect(word).not.toHaveLength(0);
  });

  it('refuses a way of playing nobody offers', () => {
    expect(() => modeById('speedrun' as ModeId)).toThrow('speedrun');
  });

  /** Every mode has a seed column, or the games it starts cannot be told apart. */
  it('rides in the seed of every game it starts', () => {
    for (const mode of MODES) {
      expect(modeOf(numberedSeed(1, 'sm', mode.id))).toBe(mode.id);
    }
  });
});

/**
 * What the app calls a game wherever it titles one. A difficulty on its own
 * stopped being the whole name the day the same number became a different
 * puzzle on each side of the mode menu.
 */
describe('naming a game', () => {
  it('says how it is played, then how hard it is', () => {
    expect(gameTitle('pure', 'Beginner')).toBe('Pure beginner');
    expect(gameTitle(DAILY, 'Advanced')).toBe('Daily advanced');
    expect(gameTitle('classic', 'Legend')).toBe('Classic legend');
  });

  /** All three ways of playing, at all five difficulties, and no two alike. */
  it('names every game the app can set', () => {
    const titles = (['pure', 'classic', DAILY] as PlayedAs[]).flatMap((playedAs) =>
      SIZES.map((size) => gameTitle(playedAs, size.difficulty)),
    );
    expect(titles).toHaveLength(15);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) expect(title).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
  });

  it('knows the daily is one of the three, and not a mode', () => {
    expect(playedAsName(DAILY)).toBe('Daily');
    expect(playedAsName('pure')).toBe('Pure');
    expect(playedAsName('classic')).toBe('Classic');
  });

  it('refuses a way of playing nobody offers', () => {
    expect(() => playedAsName('speedrun' as PlayedAs)).toThrow('speedrun');
  });
});
