import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  completedOnPage,
  dailyDone,
  dailySeed,
  dayKey,
  findCompleted,
  pageNumbers,
  PAGE_SIZE,
} from '../library';
import type { CompletedGame } from '../persistence';

function finished(overrides: Partial<CompletedGame> = {}): CompletedGame {
  return {
    seed: 1,
    themeId: 'cafe',
    themeName: 'Corner Café',
    themeIcon: 'cafe/theme',
    sizeId: 'sm',
    sizeLabel: '4 × 4',
    difficulty: 'Advanced',
    seconds: 120,
    cluesUsed: 4,
    revealed: false,
    finishedAt: Date.now(),
    ...overrides,
  };
}

describe('pageNumbers', () => {
  it('counts from one on the first page', () => {
    expect(pageNumbers(0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pageNumbers(0)).toHaveLength(PAGE_SIZE);
  });

  it('carries on where the page before it stopped', () => {
    const first = pageNumbers(0);
    const second = pageNumbers(1);
    expect(second[0]).toBe(first[first.length - 1] + 1);
    expect(second).toHaveLength(PAGE_SIZE);
  });
});

describe('findCompleted', () => {
  const history = [
    finished({ seed: 3, seconds: 90 }),
    finished({ seed: 3, seconds: 200 }),
    finished({ seed: 3, sizeId: 'lg', seconds: 500 }),
  ];

  it('matches on the shape as well as the number', () => {
    expect(findCompleted(history, 'lg', 3)?.seconds).toBe(500);
  });

  it('takes the newest of a game played more than once', () => {
    // History is kept newest first, so that is the one at the front.
    expect(findCompleted(history, 'sm', 3)?.seconds).toBe(90);
  });

  it('says nothing for a game that has not been played', () => {
    expect(findCompleted(history, 'sm', 4)).toBeNull();
  });
});

describe('completedOnPage', () => {
  it('finds every game on the page and no others', () => {
    const history = [finished({ seed: 2 }), finished({ seed: 40 }), finished({ seed: 5 })];
    // 40 is off this page; 2 and 5 are on it.
    const found = completedOnPage(history, 'sm', pageNumbers(0));
    expect([...found.keys()].sort((a, b) => a - b)).toEqual([2, 5]);
  });

  it('agrees with findCompleted on which game each number holds', () => {
    const history = [finished({ seed: 6, seconds: 61 }), finished({ seed: 6, seconds: 62 })];
    const found = completedOnPage(history, 'sm', pageNumbers(0));
    expect(found.get(6)).toEqual(findCompleted(history, 'sm', 6));
  });
});

describe('dailySeed', () => {
  it('reads the date straight off the calendar', () => {
    expect(dailySeed(new Date(2026, 7, 29))).toBe(20260829);
    expect(dailySeed(new Date(2026, 0, 2))).toBe(20260102);
  });

  it('gives every date in a four-year span its own puzzle', () => {
    const seen = new Map<number, string>();
    const day = new Date(2024, 0, 1);
    while (day.getFullYear() < 2028) {
      const seed = dailySeed(day);
      const key = dayKey(day);
      expect(seen.has(seed)).toBe(false);
      seen.set(seed, key);
      day.setDate(day.getDate() + 1);
    }
    // Four years including a leap day.
    expect(seen.size).toBe(1461);
  });

  it('runs in calendar order, so a later date is a larger number', () => {
    expect(dailySeed(new Date(2026, 1, 12))).toBeLessThan(dailySeed(new Date(2026, 2, 8)));
    expect(dailySeed(new Date(2026, 11, 31))).toBeLessThan(dailySeed(new Date(2027, 0, 1)));
  });

  it('gives every shape the same seed on a given day', () => {
    const day = new Date(2026, 0, 1);
    expect(dailySeed(day)).toBe(dailySeed(new Date(day)));
  });

  it('builds a real puzzle at every shape', () => {
    const seed = dailySeed(new Date(2026, 5, 15));
    for (const size of SIZES) {
      const puzzle = generatePuzzle({ theme: THEMES, size, seed });
      expect(puzzle.seed).toBe(seed);
      expect(puzzle.solution).toHaveLength(size.categories);
    }
  });
});

describe('dayKey', () => {
  it('pads the month and the date', () => {
    expect(dayKey(new Date(2026, 0, 2))).toBe('2026-01-02');
  });
});

describe('dailyDone', () => {
  const today = new Date(2026, 7, 29);
  const seed = dailySeed(today);

  it('finds a challenge finished today', () => {
    const history = [finished({ seed, finishedAt: today.getTime() })];
    expect(dailyDone(history, 'sm', today)?.seed).toBe(seed);
  });

  it('does not count another shape', () => {
    const history = [finished({ seed, sizeId: 'lg', finishedAt: today.getTime() })];
    expect(dailyDone(history, 'sm', today)).toBeNull();
  });

  it('does not count yesterday', () => {
    const yesterday = new Date(2026, 7, 28);
    const history = [finished({ seed: dailySeed(yesterday), finishedAt: yesterday.getTime() })];
    expect(dailyDone(history, 'sm', yesterday)).not.toBeNull();
    expect(dailyDone(history, 'sm', today)).toBeNull();
  });

  it('does not count a numbered game that happens to carry the date as its seed', () => {
    // The two share a seed space, so a game numbered 20260829 would answer for
    // the 29th of August if the day were not checked as well.
    const lastYear = new Date(2025, 5, 5).getTime();
    const history = [finished({ seed, finishedAt: lastYear })];
    expect(dailyDone(history, 'sm', today)).toBeNull();
  });

  it('is nothing before the day is played', () => {
    expect(dailyDone([], 'sm', today)).toBeNull();
  });
});
