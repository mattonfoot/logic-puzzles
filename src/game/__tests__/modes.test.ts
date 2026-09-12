import { DEFAULT_MODE, MODES, modeById, type ModeId } from '../modes';
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
