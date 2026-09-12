import { Share } from 'react-native';

import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { numberedSeed } from '../library';
import { clueSquares, formatDate, resultText, shareResult } from '../share';

const daily = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: 20260902 });
// Expert #7, played each way: the seed carries the number, the difficulty and
// the way it was played, and the heading reads all three back out of it.
const numbered = generatePuzzle({
  theme: THEMES,
  size: SIZES[2],
  seed: numberedSeed(7, SIZES[2].id, 'pure'),
});
const classic = generatePuzzle({
  theme: THEMES,
  size: SIZES[2],
  seed: numberedSeed(7, SIZES[2].id, 'classic'),
});

describe('the squares', () => {
  it('fill for the clues read and stay empty for the rest', () => {
    expect(clueSquares(3, 5)).toBe('🟩🟩🟩⬜⬜');
    expect(clueSquares(0, 2)).toBe('⬜⬜');
    expect(clueSquares(5, 5)).toBe('🟩🟩🟩🟩🟩');
  });

  it('mark the clues the board had to write past the end', () => {
    expect(clueSquares(7, 5)).toBe('🟩🟩🟩🟩🟩🟨🟨');
  });
});

describe('the text', () => {
  it('names a daily by its date, and gives nothing away', () => {
    const text = resultText({
      puzzle: daily,
      seconds: 200,
      cluesUsed: 4,
      hintsAsked: 0,
      daily: true,
    });
    const [heading, line, squares] = text.split('\n');
    expect(heading).toBe('Deduction · Daily, 2 September 2026 · Advanced');
    expect(line).toBe('3:20 · 4 clues');
    expect(squares).toBe(clueSquares(4, daily.clues.length));
    for (const category of daily.categories) {
      for (const item of category.items) expect(text).not.toContain(item.label);
    }
    expect(text).not.toContain(daily.themeName);
  });

  it('names a numbered game by its number and the way it was played', () => {
    const text = resultText({
      puzzle: numbered,
      seconds: 61,
      cluesUsed: 9,
      hintsAsked: 0,
      daily: false,
    });
    expect(text.split('\n')[0]).toBe('Deduction · Expert #7 · Pure');
    expect(text).toContain('1:01 · 9 clues');
  });

  /**
   * The same number the hard way is a different puzzle and a different job, so
   * a time sent without saying which is a time nobody can answer.
   */
  it('tells a Classic game from the Pure one with the same number', () => {
    const text = resultText({
      puzzle: classic,
      seconds: 61,
      cluesUsed: 9,
      hintsAsked: 0,
      daily: false,
    });
    expect(text.split('\n')[0]).toBe('Deduction · Expert #7 · Classic');
  });

  /**
   * Hints ride along only when there were some. A game finished without one
   * says so by not mentioning them, which is the better way round: the line is
   * a boast, and a nought on every share would make it an apology form.
   */
  it('adds the hints asked for, and leaves them out when there were none', () => {
    const none = resultText({
      puzzle: numbered,
      seconds: 61,
      cluesUsed: 9,
      hintsAsked: 0,
      daily: false,
    });
    expect(none).toContain('1:01 · 9 clues');
    expect(none).not.toContain('hint');

    const some = resultText({
      puzzle: numbered,
      seconds: 61,
      cluesUsed: 9,
      hintsAsked: 2,
      daily: false,
    });
    expect(some).toContain('1:01 · 9 clues · 2 hints');

    const one = resultText({
      puzzle: numbered,
      seconds: 61,
      cluesUsed: 1,
      hintsAsked: 1,
      daily: false,
    });
    expect(one).toContain('1:01 · 1 clue · 1 hint');
  });

  it('says the date the way it is said', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('1 January 2026');
  });
});

describe('sharing', () => {
  it('hands the text to the share sheet', async () => {
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await shareResult({ puzzle: daily, seconds: 200, cluesUsed: 4, hintsAsked: 0, daily: true });
    expect(sheet).toHaveBeenCalledWith({
      message: resultText({
        puzzle: daily,
        seconds: 200,
        cluesUsed: 4,
        hintsAsked: 0,
        daily: true,
      }),
    });
    sheet.mockRestore();
  });

  it('costs nothing when there is nowhere to share to', async () => {
    const sheet = jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
    await expect(
      shareResult({ puzzle: daily, seconds: 1, cluesUsed: 0, hintsAsked: 0, daily: true }),
    ).resolves.toBeUndefined();
    sheet.mockRestore();
  });
});
