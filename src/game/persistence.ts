/**
 * Shapes that get written to disk, plus the guards used when reading them back.
 *
 * Storage is untrusted input: it may have been written by an older build, or by
 * a build that stored a puzzle whose theme has since changed. Everything that
 * comes back is validated before it reaches the game.
 */
import { makeSize, normaliseSizeId, sizeFromId } from '../data/sizes';
import type { Puzzle, SizeOption } from '../puzzle/types';
import type { Marks } from './board';

/** Version 2 replaced the four size presets with separate sets/items dials. */
export const SAVE_VERSION = 2;
export const HISTORY_VERSION = 2;
const READABLE_SAVE_VERSIONS = [1, 2];
const READABLE_HISTORY_VERSIONS = [1, 2];
/** How many finished games are kept; older ones fall off the end. */
export const HISTORY_LIMIT = 300;

/** A game the player can come back to. */
export interface SavedGame {
  version: number;
  puzzle: Puzzle;
  marks: Marks;
  /** Indices of the clues the player has crossed off. */
  crossedOut: number[];
  seconds: number;
  hintsUsed: number;
  activePair: number;
  updatedAt: number;
}

/** A game the player finished, kept for the statistics. */
export interface CompletedGame {
  seed: number;
  themeId: string;
  themeName: string;
  themeEmoji: string;
  accent: string;
  sizeId: string;
  sizeLabel: string;
  seconds: number;
  hintsUsed: number;
  clueCount: number;
  /** True when the player pressed "reveal" instead of solving it. */
  revealed: boolean;
  finishedAt: number;
}

export interface History {
  version: number;
  games: CompletedGame[];
}

export const EMPTY_HISTORY: History = { version: HISTORY_VERSION, games: [] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Rebuilds a size from whatever a build wrote: the current `{ sets, items }`,
 * or version 1's `{ categories, items }` preset.
 */
function reviveSize(value: unknown): SizeOption | null {
  if (!isObject(value)) return null;
  const items = value.items;
  const sets = typeof value.sets === 'number' ? value.sets : value.categories;
  if (typeof items === 'number' && typeof sets === 'number' && items > 0 && sets > 1) {
    return makeSize(sets, items);
  }
  return typeof value.id === 'string' ? sizeFromId(value.id) : null;
}

function isPuzzle(value: unknown): value is Puzzle {
  if (!isObject(value)) return false;
  const { categories, solution, clues, size } = value;
  if (!Array.isArray(categories) || categories.length === 0) return false;
  if (!Array.isArray(solution) || solution.length !== categories.length) return false;
  if (!Array.isArray(clues) || !isObject(size)) return false;
  if (typeof value.seed !== 'number' || typeof value.themeId !== 'string') return false;
  if (typeof size.items !== 'number' || size.items !== solution[0]?.length) return false;
  return solution.every((row) => Array.isArray(row) && row.length === size.items);
}

export function isSavedGame(value: unknown): value is SavedGame {
  if (!isObject(value) || value.version !== SAVE_VERSION) return false;
  if (!isPuzzle(value.puzzle)) return false;
  if (!isObject(value.marks)) return false;
  if (!Array.isArray(value.crossedOut)) return false;
  return typeof value.seconds === 'number' && typeof value.hintsUsed === 'number';
}

/**
 * Reads a saved game back, bringing an older one up to date. Anything that
 * cannot be made sense of returns null, which the app treats as "nothing
 * saved" rather than an error.
 */
export function reviveSavedGame(value: unknown): SavedGame | null {
  if (!isObject(value)) return null;
  if (typeof value.version !== 'number' || !READABLE_SAVE_VERSIONS.includes(value.version)) {
    return null;
  }
  if (!isObject(value.puzzle)) return null;

  const size = reviveSize(value.puzzle.size);
  if (!size) return null;

  const migrated = {
    ...value,
    version: SAVE_VERSION,
    puzzle: { ...value.puzzle, size },
  };
  return isSavedGame(migrated) ? migrated : null;
}

function isCompletedGame(value: unknown): value is CompletedGame {
  if (!isObject(value)) return false;
  return (
    typeof value.seed === 'number' &&
    typeof value.themeId === 'string' &&
    typeof value.sizeId === 'string' &&
    typeof value.seconds === 'number' &&
    typeof value.finishedAt === 'number'
  );
}

export function isHistory(value: unknown): value is History {
  if (!isObject(value) || value.version !== HISTORY_VERSION) return false;
  return Array.isArray(value.games) && value.games.every(isCompletedGame);
}

/**
 * Reads the finished games back. Games recorded against the old size presets
 * keep their place in the statistics: `xs`/`sm`/`md`/`lg` name the same shapes
 * the sets/items dials now produce.
 */
export function reviveHistory(value: unknown): History | null {
  if (!isObject(value)) return null;
  if (typeof value.version !== 'number' || !READABLE_HISTORY_VERSIONS.includes(value.version)) {
    return null;
  }
  if (!Array.isArray(value.games)) return null;

  const games = value.games.filter(isCompletedGame).map((game) => {
    const size = sizeFromId(normaliseSizeId(game.sizeId));
    return size ? { ...game, sizeId: size.id, sizeLabel: size.label } : game;
  });

  return { version: HISTORY_VERSION, games };
}

/** Newest first, capped at `limit`. */
export function appendGame(history: History, game: CompletedGame, limit = HISTORY_LIMIT): History {
  return {
    version: HISTORY_VERSION,
    games: [game, ...history.games].slice(0, limit),
  };
}

interface CompletionInput {
  seconds: number;
  hintsUsed: number;
  revealed: boolean;
  finishedAt: number;
}

export function completedGameFrom(puzzle: Puzzle, input: CompletionInput): CompletedGame {
  return {
    seed: puzzle.seed,
    themeId: puzzle.themeId,
    themeName: puzzle.themeName,
    themeEmoji: puzzle.themeEmoji,
    accent: puzzle.accent,
    sizeId: puzzle.size.id,
    sizeLabel: puzzle.size.label,
    seconds: Math.max(0, Math.round(input.seconds)),
    hintsUsed: input.hintsUsed,
    clueCount: puzzle.clues.length,
    revealed: input.revealed,
    finishedAt: input.finishedAt,
  };
}
