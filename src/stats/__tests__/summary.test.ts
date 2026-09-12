import { dailySeed, numberedSeed } from '../../game/library';
import type { ModeId } from '../../game/modes';
import type { CompletedGame } from '../../game/persistence';
import { filedAs, improvementFor, statsForSize, summarise, TREND_WINDOW } from '../summary';

const SIZES = [
  { id: 'sm', label: '4 × 4', difficulty: 'Advanced' },
  { id: 'md', label: '5 × 4', difficulty: 'Expert' },
];

const DAY = 86_400_000;
const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

function game(overrides: Partial<CompletedGame> = {}): CompletedGame {
  return {
    // A real numbered seed: it carries the number, the difficulty and the way
    // the game was played, and the summary reads the last of those back out of
    // it rather than off a field of its own.
    seed: numberedSeed(1, 'sm', 'pure'),
    themeId: 'cosmic',
    themeName: 'Cosmic Voyage',
    themeIcon: 'cosmic/theme',
    sizeId: 'sm',
    sizeLabel: '4 × 4',
    difficulty: 'Advanced',
    seconds: 120,
    cluesUsed: 4,
    hintsAsked: 0,
    revealed: false,
    finishedAt: NOON,
    ...overrides,
  };
}

/** The same game played the other way: a different puzzle, on its own list. */
function played(mode: ModeId, overrides: Partial<CompletedGame> = {}): CompletedGame {
  const sizeId = overrides.sizeId ?? 'sm';
  return game({ ...overrides, sizeId, seed: numberedSeed(1, sizeId, mode) });
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
      game({ seconds: 300, sizeId: 'md', sizeLabel: '5 × 4', difficulty: 'Expert' }),
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
  /**
   * A game finished before hints existed stores null, and counting that as a
   * nought would credit somebody with managing without a thing nobody offered
   * them. It is left out of the total, the way an uncounted clue is.
   */
  it('leaves a game that never counted hints out of the total', () => {
    const games = newestFirst(
      game({ hintsAsked: null }),
      game({ hintsAsked: 2, themeId: 'reef' }),
      game({ hintsAsked: null, themeId: 'cafe' }),
    );
    expect(summarise(games, SIZES, NOON).hintsAsked).toBe(2);
  });

  it('counts solves, reveals, clues, hints and themes', () => {
    const games = newestFirst(
      game({ seconds: 100, cluesUsed: 2, hintsAsked: 1 }),
      game({ seconds: 150, themeId: 'reef', cluesUsed: 6, hintsAsked: 3 }),
      game({ seconds: 10, revealed: true, cluesUsed: 9, hintsAsked: 5 }),
    );
    const stats = summarise(games, SIZES, NOON);

    expect(stats.solved).toBe(2);
    expect(stats.revealed).toBe(1);
    expect(stats.totalSeconds).toBe(250);
    // The revealed game is left out of all three, as it is out of the times.
    expect(stats.cluesUsed).toBe(8);
    expect(stats.averageClues).toBe(4);
    expect(stats.hintsAsked).toBe(4);
    expect(stats.themesPlayed).toBe(2);
    expect(stats.played.map((kind) => kind.playedAs)).toEqual(['pure', 'classic', 'daily']);
    expect(stats.played[0].sizes.map((size) => size.sizeId)).toEqual(['sm', 'md']);
  });

  /**
   * The two ways of playing are two lists of puzzles and two jobs, so the
   * per-difficulty numbers are kept apart. The totals above them are not: how
   * many puzzles somebody has finished is a count of everything they have done.
   */
  it('splits the times by the way the game was played, and totals both', () => {
    const games = newestFirst(
      played('pure', { seconds: 100 }),
      played('classic', { seconds: 400 }),
      played('classic', { seconds: 500 }),
    );
    const stats = summarise(games, SIZES, NOON);
    const [pure, classic] = stats.played;

    expect(stats.solved).toBe(3);
    expect(pure.solved).toBe(1);
    expect(classic.solved).toBe(2);
    expect(pure.sizes[0].bestSeconds).toBe(100);
    expect(classic.sizes[0].bestSeconds).toBe(400);
    expect(classic.sizes[0].averageSeconds).toBe(450);
    // And the other difficulty has nothing on either side.
    expect(pure.sizes[1].solved).toBe(0);
  });

  /**
   * A daily is nobody's choice: it is handed out, one per difficulty per day,
   * and played once. Its time belongs beside the other dailies rather than in
   * the middle of somebody's run at a difficulty.
   */
  it('files a daily on its own rather than with the Pure games', () => {
    const day = dailySeed(new Date(2026, 7, 29), 'sm');
    expect(filedAs(game({ seed: day }))).toBe('daily');

    const games = newestFirst(played('pure', { seconds: 100 }), game({ seed: day, seconds: 250 }));
    const stats = summarise(games, SIZES, NOON);
    const [pure, , daily] = stats.played;

    expect(stats.solved).toBe(2);
    expect(pure.solved).toBe(1);
    expect(daily.solved).toBe(1);
    expect(pure.sizes[0].bestSeconds).toBe(100);
    expect(daily.sizes[0].bestSeconds).toBe(250);
  });

  it('does not measure a daily against the numbered games', () => {
    const day = dailySeed(new Date(2026, 7, 29), 'sm');
    const numbered = [played('pure', { seconds: 100 })];
    expect(improvementFor(game({ seed: day, seconds: 400 }), numbered).kind).toBe('first');
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
    // Puzzles are called by their difficulty, not by their shape.
    expect(result.headline).toContain('Advanced');
    expect(result.headline).not.toContain('4 × 4');
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
    const previous = [
      game({ seconds: 10, sizeId: 'md', sizeLabel: '5 × 4', difficulty: 'Expert' }),
    ];
    expect(improvementFor(game({ seconds: 300 }), previous).kind).toBe('first');
  });

  /**
   * A Classic board is a slower job than the Pure one beside it — the crosses
   * are the player's to rule out — so a first Classic game is a first game,
   * however many Pure ones came before it, and a quick Pure game is not a best
   * over a Classic time it was never racing.
   */
  it('only compares against games played the same way', () => {
    const pure = [played('pure', { seconds: 100 }), played('pure', { seconds: 120 })];
    expect(improvementFor(played('classic', { seconds: 400 }), pure).kind).toBe('first');

    const classic = [played('classic', { seconds: 400 })];
    expect(improvementFor(played('pure', { seconds: 300 }), classic).kind).toBe('first');
    expect(improvementFor(played('pure', { seconds: 90 }), [...pure, ...classic]).kind).toBe(
      'best',
    );
  });
});
