import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  completedInRange,
  completedOnPage,
  dailyDate,
  dailyDone,
  dailySeed,
  dailyStreak,
  dayKey,
  looksDaily,
  findCompleted,
  MAX_ZOOM,
  pageNumbers,
  PAGE_SIZE,
  rangesOn,
  span,
  zoomInto,
  zoomOut,
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
    hintsAsked: 0,
    revealed: false,
    finishedAt: Date.now(),
    ...overrides,
  };
}

describe('pageNumbers', () => {
  it('counts from one on the first page', () => {
    expect(pageNumbers(0)).toEqual([1, 2, 3, 4, 5]);
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
    const history = [finished({ seed: 5, seconds: 61 }), finished({ seed: 5, seconds: 62 })];
    const found = completedOnPage(history, 'sm', pageNumbers(0));
    expect(found.get(5)).toEqual(findCompleted(history, 'sm', 5));
  });
});

describe('dailySeed', () => {
  const day = new Date(2026, 7, 29);

  it('puts the date in its columns and the difficulty in the last one', () => {
    expect(dailySeed(day, 'xs')).toBe(202608290);
    expect(dailySeed(day, 'sm')).toBe(202608291);
    expect(dailySeed(day, 'md')).toBe(202608292);
    expect(dailySeed(day, 'lg')).toBe(202608293);
    expect(dailySeed(new Date(2026, 0, 2), 'xs')).toBe(202601020);
  });

  it('gives the four challenges of a day four different puzzles', () => {
    const seeds = SIZES.map((size) => dailySeed(day, size.id));
    expect(new Set(seeds).size).toBe(SIZES.length);

    // The seed is the only thing the generator is handed, so four seeds is what
    // it takes for four challenges to be four puzzles rather than one puzzle at
    // four shapes. Drawn at one shape, so it is the seed being compared and
    // nothing else.
    const drawn = seeds.map((seed) =>
      JSON.stringify(generatePuzzle({ theme: THEMES, size: SIZES[1], seed }).solution),
    );
    expect(new Set(drawn).size).toBe(SIZES.length);
  });

  it('gives every date and difficulty in a four-year span its own puzzle', () => {
    const seen = new Set<number>();
    const walk = new Date(2024, 0, 1);
    while (walk.getFullYear() < 2028) {
      for (const size of SIZES) {
        const seed = dailySeed(walk, size.id);
        expect(seen.has(seed)).toBe(false);
        seen.add(seed);
      }
      walk.setDate(walk.getDate() + 1);
    }
    // Four years including a leap day, four ways each.
    expect(seen.size).toBe(1461 * SIZES.length);
  });

  it('runs in calendar order, so a later date is a larger number', () => {
    expect(dailySeed(new Date(2026, 1, 12), 'sm')).toBeLessThan(
      dailySeed(new Date(2026, 2, 8), 'sm'),
    );
    expect(dailySeed(new Date(2026, 11, 31), 'lg')).toBeLessThan(
      dailySeed(new Date(2027, 0, 1), 'xs'),
    );
  });

  it('refuses a shape it has no column for', () => {
    expect(() => dailySeed(day, 'xxl')).toThrow('xxl');
  });

  it('builds a real puzzle at every shape', () => {
    for (const size of SIZES) {
      const seed = dailySeed(new Date(2026, 5, 15), size.id);
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
  const seed = dailySeed(today, 'sm');

  it('finds a challenge finished today', () => {
    const history = [finished({ seed, finishedAt: today.getTime() })];
    expect(dailyDone(history, 'sm', today)?.seed).toBe(seed);
  });

  it('does not count another shape', () => {
    const history = [finished({ seed, sizeId: 'lg', finishedAt: today.getTime() })];
    expect(dailyDone(history, 'sm', today)).toBeNull();
  });

  /**
   * A daily played this morning, before the four difficulties had seeds of
   * their own, is still that difficulty's daily done. Asking somebody to play
   * it again because the seed has been rearranged under them would be the app
   * losing their game.
   */
  it("still finds today's, played on a build that seeded all four the same", () => {
    const history = [finished({ seed: 20260829, finishedAt: today.getTime() })];
    expect(dailyDone(history, 'sm', today)?.seed).toBe(20260829);
    // Still only the shape it was played at.
    expect(dailyDone(history, 'lg', today)).toBeNull();
  });

  it('does not count yesterday', () => {
    const yesterday = new Date(2026, 7, 28);
    const history = [
      finished({ seed: dailySeed(yesterday, 'sm'), finishedAt: yesterday.getTime() }),
    ];
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

describe('dailyDate', () => {
  it('reads the date back out of the seed, whichever difficulty it is', () => {
    for (const size of SIZES) {
      expect(dailyDate(dailySeed(new Date(2031, 0, 31), size.id))).toEqual(new Date(2031, 0, 31));
    }
  });

  it('reads a seed from before the difficulties were told apart', () => {
    expect(dailyDate(20260902)).toEqual(new Date(2026, 8, 2));
  });
});

describe('looksDaily', () => {
  it('knows a date from a number', () => {
    expect(looksDaily(202609021)).toBe(true);
    expect(looksDaily(7)).toBe(false);
    expect(looksDaily(202613010)).toBe(false);
    expect(looksDaily(202602310)).toBe(false);
    expect(looksDaily(199912310)).toBe(false);
  });

  it('still knows one from before the difficulties were told apart', () => {
    expect(looksDaily(20260902)).toBe(true);
    expect(looksDaily(20261301)).toBe(false);
    expect(looksDaily(20260231)).toBe(false);
    expect(looksDaily(19991231)).toBe(false);
  });

  it('does not read a column no difficulty was ever handed out at', () => {
    // Four difficulties, so 4 to 9 are nobody's; the number falls back to being
    // read whole, and whole it is no date.
    expect(looksDaily(202609024)).toBe(false);
    expect(looksDaily(202609029)).toBe(false);
  });
});

describe('dailyStreak', () => {
  const noon = (daysAgo: number) => {
    const day = new Date(2026, 8, 2, 12);
    day.setDate(day.getDate() - daysAgo);
    return day;
  };
  const daily = (daysAgo: number, sizeId = 'sm') =>
    finished({
      seed: dailySeed(noon(daysAgo), sizeId),
      sizeId,
      finishedAt: noon(daysAgo).getTime(),
    });

  it('is nothing until a daily has been finished', () => {
    expect(dailyStreak([], noon(0))).toBe(0);
    expect(dailyStreak([finished({ seed: 3, finishedAt: noon(0).getTime() })], noon(0))).toBe(0);
  });

  it('counts the days running back from today', () => {
    expect(dailyStreak([daily(0), daily(1), daily(2)], noon(0))).toBe(3);
    expect(dailyStreak([daily(0), daily(1), daily(3)], noon(0))).toBe(2);
  });

  it('counts a day once however many of its four were finished', () => {
    expect(dailyStreak([daily(0, 'xs'), daily(0, 'lg'), daily(1)], noon(0))).toBe(2);
  });

  it("survives on yesterday's while today is still in progress", () => {
    expect(dailyStreak([daily(1), daily(2)], noon(0))).toBe(2);
    expect(dailyStreak([daily(2), daily(3)], noon(0))).toBe(0);
  });

  it('does not count a daily finished on a later day', () => {
    // Yesterday's seed, finished today: not yesterday's challenge done.
    const late = finished({ seed: dailySeed(noon(1), 'sm'), finishedAt: noon(0).getTime() });
    expect(dailyStreak([late], noon(0))).toBe(0);
  });
});

describe('the catalogue, zoomed out', () => {
  it('is the puzzles themselves at level zero', () => {
    expect(rangesOn({ level: 0, page: 0 }).map((range) => range.first)).toEqual(pageNumbers(0));
    expect(rangesOn({ level: 0, page: 2 })[0]).toEqual({ first: 11, last: 11 });
  });

  it('stands each row for five times as many puzzles per level', () => {
    expect(span(0)).toBe(1);
    expect(span(1)).toBe(PAGE_SIZE);
    expect(rangesOn({ level: 1, page: 0 })).toEqual([
      { first: 1, last: 5 },
      { first: 6, last: 10 },
      { first: 11, last: 15 },
      { first: 16, last: 20 },
      { first: 21, last: 25 },
    ]);
    expect(rangesOn({ level: 2, page: 0 })[1]).toEqual({ first: 26, last: 50 });
    expect(rangesOn({ level: 2, page: 1 })[0]).toEqual({ first: 126, last: 150 });
  });

  it('zooms out to the page whose rows hold the one being left', () => {
    expect(zoomOut({ level: 0, page: 0 })).toEqual({ level: 1, page: 0 });
    // Page 16 at level 0 is puzzles 81–85: row 1 of the level-1 page that
    // runs 76–100, so that is the page it lands on.
    expect(zoomOut({ level: 0, page: 16 })).toEqual({ level: 1, page: 3 });
    expect(rangesOn(zoomOut({ level: 0, page: 16 }))[1]).toEqual({ first: 81, last: 85 });
  });

  it('zooms into the page a row stands for', () => {
    expect(zoomInto({ level: 1, page: 0 }, 1)).toEqual({ level: 0, page: 1 });
    expect(pageNumbers(zoomInto({ level: 1, page: 0 }, 1).page)[0]).toBe(6);
    expect(zoomInto({ level: 2, page: 1 }, 0)).toEqual({ level: 1, page: 5 });
    expect(rangesOn({ level: 1, page: 5 })[0]).toEqual({ first: 126, last: 130 });
  });

  it('comes back to where it started', () => {
    for (let page = 0; page < 50; page++) {
      const out = zoomOut({ level: 0, page });
      const row = page % PAGE_SIZE;
      expect(zoomInto(out, row)).toEqual({ level: 0, page });
    }
  });

  it('stops zooming out at the top', () => {
    let view = { level: 0, page: 0 };
    for (let step = 0; step < 6; step++) view = zoomOut(view);
    expect(view.level).toBe(MAX_ZOOM);
    expect(zoomInto({ level: 0, page: 3 }, 0).level).toBe(0);
  });

  it('counts the puzzles finished in a run, each once', () => {
    const history = [
      finished({ seed: 2 }),
      finished({ seed: 2, seconds: 50 }),
      finished({ seed: 5 }),
      finished({ seed: 7 }),
      finished({ seed: 3, sizeId: 'lg' }),
    ];
    expect(completedInRange(history, 'sm', { first: 1, last: 5 })).toBe(2);
    expect(completedInRange(history, 'sm', { first: 6, last: 10 })).toBe(1);
    expect(completedInRange(history, 'lg', { first: 1, last: 5 })).toBe(1);
  });
});
