/**
 * Turns the list of finished games into the numbers the app shows the player.
 *
 * All of it is pure: the same history always yields the same summary, which
 * keeps it easy to test and cheap to recompute on every render.
 */
import { sizeFromId } from '../data/sizes';
import type { CompletedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';

/** How many recent games make up the "lately" window used for trends. */
export const TREND_WINDOW = 5;
/** A trend needs enough games on both sides of the comparison to mean anything. */
const MIN_RECENT = 3;
const MIN_EARLIER = 2;

export interface SizeStats {
  sizeId: string;
  sizeLabel: string;
  solved: number;
  bestSeconds: number | null;
  averageSeconds: number | null;
  /** Mean of the last `TREND_WINDOW` solves, newest window. */
  recentAverage: number | null;
  /** Mean of the `TREND_WINDOW` solves before those, for comparison. */
  earlierAverage: number | null;
  /** Fraction faster than the earlier window; positive means improving. */
  trend: number | null;
  noHintSolves: number;
  lastPlayedAt: number | null;
  /** Solve times oldest → newest, for the trend chart. */
  times: number[];
}

export interface OverallStats {
  solved: number;
  revealed: number;
  totalSeconds: number;
  hintsUsed: number;
  noHintSolves: number;
  themesPlayed: number;
  currentStreak: number;
  longestStreak: number;
  sizes: SizeStats[];
  /** Newest first. */
  recent: CompletedGame[];
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((total, value) => total + value, 0) / values.length;

/** Local calendar day, so streaks line up with the player's own days. */
function dayNumber(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
}

function streaks(games: CompletedGame[], now: number): { current: number; longest: number } {
  if (games.length === 0) return { current: 0, longest: 0 };

  const days = [...new Set(games.map((game) => dayNumber(game.finishedAt)))].sort((a, b) => b - a);
  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index++) {
    run = days[index - 1] - days[index] === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = dayNumber(now);
  // A streak survives until the end of the following day, so finishing
  // yesterday still counts while today is in progress.
  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    for (let index = 1; index < days.length; index++) {
      if (days[index - 1] - days[index] !== 1) break;
      current++;
    }
  }

  return { current, longest };
}

export function statsForSize(
  games: CompletedGame[],
  size: Pick<SizeOption, 'id' | 'label'>,
): SizeStats {
  // History arrives newest first; solve times read better oldest → newest.
  const solved = games.filter((game) => game.sizeId === size.id && !game.revealed);
  const times = solved.map((game) => game.seconds).reverse();
  const recentWindow = times.slice(-TREND_WINDOW);
  const earlierWindow = times.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
  const recentAverage = mean(recentWindow);
  const earlierAverage = mean(earlierWindow);

  return {
    sizeId: size.id,
    sizeLabel: size.label,
    solved: solved.length,
    bestSeconds: times.length === 0 ? null : Math.min(...times),
    averageSeconds: mean(times),
    recentAverage,
    earlierAverage,
    trend:
      recentAverage !== null &&
      earlierAverage !== null &&
      earlierAverage > 0 &&
      recentWindow.length >= MIN_RECENT &&
      earlierWindow.length >= MIN_EARLIER
        ? (earlierAverage - recentAverage) / earlierAverage
        : null,
    noHintSolves: solved.filter((game) => game.hintsUsed === 0).length,
    lastPlayedAt: solved.length === 0 ? null : Math.max(...solved.map((g) => g.finishedAt)),
    times,
  };
}

export function summarise(
  games: CompletedGame[],
  sizes: Pick<SizeOption, 'id' | 'label'>[],
  now: number = Date.now(),
): OverallStats {
  const solvedGames = games.filter((game) => !game.revealed);
  const { current, longest } = streaks(solvedGames, now);

  return {
    solved: solvedGames.length,
    revealed: games.length - solvedGames.length,
    totalSeconds: solvedGames.reduce((total, game) => total + game.seconds, 0),
    hintsUsed: solvedGames.reduce((total, game) => total + game.hintsUsed, 0),
    noHintSolves: solvedGames.filter((game) => game.hintsUsed === 0).length,
    themesPlayed: new Set(solvedGames.map((game) => game.themeId)).size,
    currentStreak: current,
    longestStreak: longest,
    sizes: sizes.map((size) => statsForSize(games, size)),
    recent: games.slice(0, 20),
  };
}

export type ImprovementKind = 'revealed' | 'first' | 'best' | 'faster' | 'steady';

/** The "how did that go?" note shown when a puzzle is finished. */
export interface Improvement {
  kind: ImprovementKind;
  headline: string;
  detail: string;
  previousBest: number | null;
  averageBefore: number | null;
  /** 1 means it is the fastest solve at this size so far. */
  rank: number | null;
  solvedBefore: number;
}

const percent = (fraction: number): string => `${Math.round(Math.abs(fraction) * 100)}%`;

/** "4 sets of 5" where the shape is known, else whatever was recorded. */
const shapeName = (game: CompletedGame): string =>
  sizeFromId(game.sizeId)?.description ?? game.sizeLabel;

/**
 * Compares a finished game with the player's earlier games at the same size.
 * `previous` is the history from *before* this game was added.
 */
export function improvementFor(game: CompletedGame, previous: CompletedGame[]): Improvement {
  const earlier = previous.filter((other) => other.sizeId === game.sizeId && !other.revealed);
  const times = earlier.map((other) => other.seconds);
  const previousBest = times.length === 0 ? null : Math.min(...times);
  const averageBefore = mean(times);
  const rank = times.filter((time) => time < game.seconds).length + 1;
  const noHints = game.hintsUsed === 0 ? ' · solved with no hints' : '';
  const shape = shapeName(game);

  if (game.revealed) {
    return {
      kind: 'revealed',
      headline: 'Solution revealed',
      detail: 'Revealed puzzles are kept out of your times.',
      previousBest,
      averageBefore,
      rank: null,
      solvedBefore: earlier.length,
    };
  }

  if (previousBest === null) {
    return {
      kind: 'first',
      headline: `First ${shape} puzzle in the books`,
      detail: `Time to beat next round: ${formatDuration(game.seconds)}${noHints}.`,
      previousBest,
      averageBefore,
      rank: 1,
      solvedBefore: 0,
    };
  }

  if (game.seconds < previousBest) {
    return {
      kind: 'best',
      headline: `New best for ${shape}!`,
      detail: `${formatDuration(previousBest - game.seconds)} faster than your old best of ${formatDuration(previousBest)}${noHints}.`,
      previousBest,
      averageBefore,
      rank: 1,
      solvedBefore: earlier.length,
    };
  }

  if (averageBefore !== null && game.seconds < averageBefore) {
    const share = (averageBefore - game.seconds) / averageBefore;
    return {
      kind: 'faster',
      headline: `${percent(share)} faster than your ${shape} average`,
      detail: `#${rank} of ${earlier.length + 1} · best is ${formatDuration(previousBest)}${noHints}.`,
      previousBest,
      averageBefore,
      rank,
      solvedBefore: earlier.length,
    };
  }

  return {
    kind: 'steady',
    headline: `${shape} complete`,
    detail: `${formatDuration(game.seconds - previousBest)} off your best of ${formatDuration(previousBest)}${noHints}.`,
    previousBest,
    averageBefore,
    rank,
    solvedBefore: earlier.length,
  };
}
