import type { CompletedGame } from '../../game/persistence';
import { improvementFor, statsForSize, summarise, TREND_WINDOW } from '../summary';

const SIZES = [
  { id: 'sm', label: '4 × 4' },
  { id: 'md', label: '5 × 4' },
];

const DAY = 86_400_000;
const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

function game(overrides: Partial<CompletedGame> = {}): CompletedGame {
  return {
    seed: 1,
    themeId: 'cosmic',
    themeName: 'Cosmic Voyage',
    themeEmoji: '🚀',
    accent: '#4C6FFF',
    sizeId: 'sm',
    sizeLabel: '4 × 4',
    seconds: 120,
    cluesUsed: 4,
    revealed: false,
    finishedAt: NOON,
    ...overrides,
  };
}

/** History is stored newest first. */
function newestFirst(...games: CompletedGame[]): CompletedGame[] {
  return [...games].reverse();
}

describe('statsForSize', () => {
  it('reports nothing for a size that has never been played', () => {
    const stats = statsForSize([], SIZES[0]);
    expect(stats).toMatchObject({
      solved: 0,
      bestSeconds: null,
      averageSeconds: null,
      trend: null,
    });
    expect(stats.times).toEqual([]);
  });

  it('summarises times oldest to newest and ignores other sizes', () => {
    const games = newestFirst(
      game({ seconds: 200 }),
      game({ seconds: 100 }),
      game({ seconds: 300, sizeId: 'md', sizeLabel: '5 × 4' }),
    );
    const stats = statsForSize(games, SIZES[0]);
    expect(stats.solved).toBe(2);
    expect(stats.times).toEqual([200, 100]);
    expect(stats.bestSeconds).toBe(100);
    expect(stats.averageSeconds).toBe(150);
  });

  it('leaves revealed puzzles out of the times', () => {
    const games = newestFirst(game({ seconds: 100 }), game({ seconds: 5, revealed: true }));
    const stats = statsForSize(games, SIZES[0]);
    expect(stats.solved).toBe(1);
    expect(stats.bestSeconds).toBe(100);
  });

  it('compares the last five solves with the five before them', () => {
    const older = Array.from({ length: TREND_WINDOW }, () => game({ seconds: 200 }));
    const newer = Array.from({ length: TREND_WINDOW }, () => game({ seconds: 100 }));
    const stats = statsForSize(newestFirst(...older, ...newer), SIZES[0]);

    expect(stats.earlierAverage).toBe(200);
    expect(stats.recentAverage).toBe(100);
    expect(stats.trend).toBeCloseTo(0.5); // half the time, so twice as fast
  });

  it('waits for enough games on both sides before reporting a trend', () => {
    const thin = Array.from({ length: TREND_WINDOW + 1 }, () => game());
    expect(statsForSize(newestFirst(...thin), SIZES[0]).trend).toBeNull();

    const enough = Array.from({ length: TREND_WINDOW + 2 }, () => game());
    expect(statsForSize(newestFirst(...enough), SIZES[0]).trend).toBe(0);
  });
});

describe('summarise', () => {
  it('counts solves, reveals, clues and themes', () => {
    const games = newestFirst(
      game({ seconds: 100, cluesUsed: 2 }),
      game({ seconds: 150, themeId: 'reef', cluesUsed: 6 }),
      game({ seconds: 10, revealed: true, cluesUsed: 9 }),
    );
    const stats = summarise(games, SIZES, NOON);

    expect(stats.solved).toBe(2);
    expect(stats.revealed).toBe(1);
    expect(stats.totalSeconds).toBe(250);
    // The revealed game is left out of both, as it is out of the times.
    expect(stats.cluesUsed).toBe(8);
    expect(stats.averageClues).toBe(4);
    expect(stats.themesPlayed).toBe(2);
    expect(stats.sizes.map((size) => size.sizeId)).toEqual(['sm', 'md']);
  });

  it('counts a streak of consecutive days, ignoring several games in one day', () => {
    const games = newestFirst(
      game({ finishedAt: NOON - 2 * DAY }),
      game({ finishedAt: NOON - DAY }),
      game({ finishedAt: NOON - DAY + 3600_000 }),
      game({ finishedAt: NOON }),
    );
    const stats = summarise(games, SIZES, NOON);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
  });

  it('keeps the streak alive on the day after the last game, then drops it', () => {
    const games = [game({ finishedAt: NOON })];
    expect(summarise(games, SIZES, NOON + DAY).currentStreak).toBe(1);
    expect(summarise(games, SIZES, NOON + 2 * DAY).currentStreak).toBe(0);
  });

  it('remembers the longest streak even after it is broken', () => {
    const games = newestFirst(
      game({ finishedAt: NOON - 10 * DAY }),
      game({ finishedAt: NOON - 9 * DAY }),
      game({ finishedAt: NOON - 8 * DAY }),
      game({ finishedAt: NOON }),
    );
    const stats = summarise(games, SIZES, NOON);
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(3);
  });
});

describe('improvementFor', () => {
  it('welcomes the first solve at a size', () => {
    const result = improvementFor(game({ seconds: 90 }), []);
    expect(result.kind).toBe('first');
    expect(result.previousBest).toBeNull();
    expect(result.detail).toContain('1:30');
  });

  it('calls out a personal best with the gap to the old one', () => {
    const previous = newestFirst(game({ seconds: 150 }), game({ seconds: 120 }));
    const result = improvementFor(game({ seconds: 100 }), previous);

    expect(result.kind).toBe('best');
    expect(result.previousBest).toBe(120);
    expect(result.rank).toBe(1);
    expect(result.detail).toContain('0:20 faster');
  });

  it('reports beating the average when it is not a best', () => {
    const previous = newestFirst(game({ seconds: 100 }), game({ seconds: 300 }));
    const result = improvementFor(game({ seconds: 150 }), previous);

    expect(result.kind).toBe('faster');
    expect(result.averageBefore).toBe(200);
    expect(result.headline).toContain('25% faster');
    expect(result.rank).toBe(2);
  });

  it('is matter-of-fact about a slower game', () => {
    const previous = [game({ seconds: 100 })];
    const result = improvementFor(game({ seconds: 160, cluesUsed: 3 }), previous);

    expect(result.kind).toBe('steady');
    expect(result.detail).toContain('1:00 off your best');
    expect(result.detail).toContain('3 clues read');
  });

  it('says nothing about clues for a game played before they were counted', () => {
    const detail = improvementFor(game({ seconds: 90, cluesUsed: null }), []).detail;
    expect(detail).not.toContain('clues');
  });

  it('keeps revealed puzzles out of the comparison', () => {
    const result = improvementFor(game({ seconds: 5, revealed: true }), [game({ seconds: 100 })]);
    expect(result.kind).toBe('revealed');
    expect(result.rank).toBeNull();
  });

  it('only compares against the same grid size', () => {
    const previous = [game({ seconds: 10, sizeId: 'md', sizeLabel: '5 × 4' })];
    expect(improvementFor(game({ seconds: 300 }), previous).kind).toBe('first');
  });
});
