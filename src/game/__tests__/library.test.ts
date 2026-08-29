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
    expect(pageNumbers(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
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
  it('is the year times the month times the date, counting months from one', () => {
    expect(dailySeed(new Date(2026, 7, 29))).toBe(2026 * 8 * 29);
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

  it('does not count a day that only shares the seed', () => {
    // February 12th and March 8th both seed on the year times 24, so the seed
    // cannot tell them apart and the date has to.
    const february = new Date(2026, 1, 12);
    const march = new Date(2026, 2, 8);
    expect(dailySeed(february)).toBe(dailySeed(march));

    const history = [finished({ seed: dailySeed(february), finishedAt: february.getTime() })];
    expect(dailyDone(history, 'sm', february)).not.toBeNull();
    expect(dailyDone(history, 'sm', march)).toBeNull();
  });

  it('is nothing before the day is played', () => {
    expect(dailyDone([], 'sm', today)).toBeNull();
  });
});
