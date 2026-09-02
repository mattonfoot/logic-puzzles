/**
 * Shapes that get written to disk, plus the guards used when reading them back.
 *
 * Storage is untrusted input: it may have been written by an older build, or by
 * a build that stored a puzzle whose theme has since changed. Everything that
 * comes back is validated before it reaches the game.
 */
import type { Puzzle } from '../puzzle/types';
import type { MarkEntry, Marks } from './board';

/**
 * 2 added the undo stack. A version-1 save reads back with an empty one, which
 * is what it always had on resuming.
 */
export const SAVE_VERSION = 2;
export const HISTORY_VERSION = 1;
/**
 * How many boards of undo are kept with a saved game.
 *
 * The stack itself runs to two hundred, but a board is the largest thing in
 * the save and there is no point writing the lot: twenty steps back is more
 * than Rewind has ever needed, and more than anyone takes back by hand.
 */
export const SAVED_UNDO = 20;
/** How many finished games are kept; older ones fall off the end. */
export const HISTORY_LIMIT = 300;

/** A game the player can come back to. */
export interface SavedGame {
  version: number;
  puzzle: Puzzle;
  marks: Marks;
  /** Indices of the clues the player has asked to see. */
  cluesSeen: number[];
  /** The clue on the table when they left, if any. */
  clueIndex: number | null;
  /**
   * The boards Undo can step back to, oldest first — the last `SAVED_UNDO` of
   * them. Without these a game picked back up could not be stepped back from,
   * and Rewind, which walks the same stack, had nothing to walk.
   */
  history: Marks[];
  seconds: number;
  updatedAt: number;
}

/** A game the player finished, kept for the statistics. */
export interface CompletedGame {
  seed: number;
  themeId: string;
  themeName: string;
  themeIcon: string;
  sizeId: string;
  /** The shape, as the grid reads: "4 × 4". */
  sizeLabel: string;
  /** What that shape is called: "Advanced". */
  difficulty: string;
  seconds: number;
  /**
   * Clues read before it was finished; null for games played before we counted.
   * There is no total to read it against — a puzzle that runs out of clues
   * writes more — so this is a count, not a share.
   */
  cluesUsed: number | null;
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

function isMarkEntry(value: unknown): value is MarkEntry {
  if (!isObject(value)) return false;
  const sourceOk = value.source === 'hand' || value.source === 'auto';
  return sourceOk && (value.mark === 'yes' || value.mark === 'no');
}

/**
 * Reads a board back, bringing older saves forward.
 *
 * Before marks carried a source, a square held nothing but `'yes'` or `'no'`;
 * those are all treated as the player's own, which is the safe reading — an
 * automatic cross that survives as a hand one is a cross that stays put a
 * little longer than it should, rather than one that vanishes.
 */
export function reviveMarks(value: unknown): Marks | null {
  if (!isObject(value)) return null;

  const marks: Marks = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isMarkEntry(entry)) marks[key] = entry;
    else if (entry === 'yes' || entry === 'no') marks[key] = { mark: entry, source: 'hand' };
    else return null;
  }
  return marks;
}

export function isSavedGame(value: unknown): value is SavedGame {
  if (!isObject(value) || value.version !== SAVE_VERSION) return false;
  if (!isPuzzle(value.puzzle)) return false;
  if (!isObject(value.marks)) return false;
  if (!Array.isArray(value.cluesSeen)) return false;
  if (value.clueIndex !== null && typeof value.clueIndex !== 'number') return false;
  if (!Array.isArray(value.history) || !value.history.every(isObject)) return false;
  return typeof value.seconds === 'number';
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
 * Reads the finished games back.
 *
 * Games played before the clue table counted hints instead, which is a
 * different thing entirely — those are recorded as having no clue count rather
 * than being read as one, so the averages are drawn from games that were
 * actually measured. Games from before the sizes were called by name fall back
 * to the shape they stored, which is what they were called at the time.
 * Everything else about them still stands.
 */
export function reviveHistory(value: unknown): History | null {
  if (!isHistory(value)) return null;
  return {
    version: value.version,
    games: value.games.map((game) => ({
      ...game,
      cluesUsed: typeof game.cluesUsed === 'number' ? game.cluesUsed : null,
      difficulty: typeof game.difficulty === 'string' ? game.difficulty : game.sizeLabel,
      // Games from when themes were an emoji have no drawing to show; the row
      // reads perfectly well without one.
      themeIcon: typeof game.themeIcon === 'string' ? game.themeIcon : '',
    })),
  };
}

/**
 * Reads a saved game back, migrating the parts that have moved on.
 *
 * A save from before the clue table kept a list of clues the player had crossed
 * off by hand and a count of hints; those crossed-off clues are the ones they
 * had read, so they come across as the clues seen and the hint count is
 * dropped. Nothing about the board itself changed, so the game resumes. A
 * version-1 save carried no undo stack, and comes across with an empty one —
 * the same board it would have resumed to before, with nothing behind it.
 *
 * A stack that is there but cannot be read refuses the whole save rather than
 * dropping the stack: a board that fails the guards was written by something
 * this build does not understand, and the marks beside it are no safer.
 */
export function reviveSavedGame(value: unknown): SavedGame | null {
  if (!isObject(value)) return null;

  const marks = reviveMarks(value.marks);
  if (!marks) return null;

  const history: Marks[] = [];
  if (Array.isArray(value.history)) {
    for (const board of value.history) {
      const revived = reviveMarks(board);
      if (!revived) return null;
      history.push(revived);
    }
  } else if (value.history !== undefined) {
    return null;
  }

  const seen = Array.isArray(value.cluesSeen)
    ? value.cluesSeen
    : Array.isArray(value.crossedOut)
      ? value.crossedOut
      : [];
  const migrated = {
    ...value,
    // Only the one version this build knows how to bring forward.
    version: value.version === 1 ? SAVE_VERSION : value.version,
    marks,
    cluesSeen: seen.filter((index: unknown) => typeof index === 'number'),
    clueIndex: typeof value.clueIndex === 'number' ? value.clueIndex : null,
    history: history.slice(-SAVED_UNDO),
  };
  return isSavedGame(migrated) ? migrated : null;
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
  cluesUsed: number;
  revealed: boolean;
  finishedAt: number;
}

export function completedGameFrom(puzzle: Puzzle, input: CompletionInput): CompletedGame {
  return {
    seed: puzzle.seed,
    themeId: puzzle.themeId,
    themeName: puzzle.themeName,
    themeIcon: puzzle.themeIcon,
    sizeId: puzzle.size.id,
    sizeLabel: puzzle.size.label,
    difficulty: puzzle.size.difficulty,
    seconds: Math.max(0, Math.round(input.seconds)),
    cluesUsed: input.cluesUsed,
    revealed: input.revealed,
    finishedAt: input.finishedAt,
  };
}
