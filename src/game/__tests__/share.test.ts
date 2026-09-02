import { Share } from 'react-native';

import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { clueSquares, formatDate, resultText, shareResult } from '../share';

const daily = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: 20260902 });
const numbered = generatePuzzle({ theme: THEMES, size: SIZES[2], seed: 7 });

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
    const text = resultText({ puzzle: daily, seconds: 200, cluesUsed: 4, daily: true });
    const [heading, line, squares] = text.split('\n');
    expect(heading).toBe('Deduction · Daily, 2 September 2026 · Advanced');
    expect(line).toBe('3:20 · 4 clues');
    expect(squares).toBe(clueSquares(4, daily.clues.length));
    for (const category of daily.categories) {
      for (const item of category.items) expect(text).not.toContain(item.label);
    }
    expect(text).not.toContain(daily.themeName);
  });

  it('names a numbered game by its number', () => {
    const text = resultText({ puzzle: numbered, seconds: 61, cluesUsed: 9, daily: false });
    expect(text.split('\n')[0]).toBe('Deduction · Expert #7');
    expect(text).toContain('1:01 · 9 clues');
  });

  it('says the date the way it is said', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('1 January 2026');
  });
});

describe('sharing', () => {
  it('hands the text to the share sheet', async () => {
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await shareResult({ puzzle: daily, seconds: 200, cluesUsed: 4, daily: true });
    expect(sheet).toHaveBeenCalledWith({
      message: resultText({ puzzle: daily, seconds: 200, cluesUsed: 4, daily: true }),
    });
    sheet.mockRestore();
  });

  it('costs nothing when there is nowhere to share to', async () => {
    const sheet = jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
    await expect(
      shareResult({ puzzle: daily, seconds: 1, cluesUsed: 0, daily: true }),
    ).resolves.toBeUndefined();
    sheet.mockRestore();
  });
});
