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
 * 2 added the undo stack, 3 the count of hints asked for, 4 the five things a
 * finished game is now measured by — marks taken back, rewinds, whether the
 * board ever contradicted itself, when it was started and whether it was ever
 * put down. Older saves read back with an empty stack and nothing against them,
 * which is what they had: a save written before any of it existed is a game
 * played without it.
 */
export const SAVE_VERSION = 4;
/** Every earlier version this build knows how to bring forward. */
const CARRIED_FORWARD = [1, 2, 3];
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
  /**
   * How many times the player has asked a clue what is wrong with the board.
   * Kept with the game so picking it back up does not wipe the tally, the same
   * way the clock and the clues read are.
   */
  hintsAsked: number;
  /**
   * How the board has been arrived at, kept with it for the same reason the
   * clock is: putting a game down and picking it up must not wipe the tally.
   * Restart clears all five, because a board put back to blank is a new attempt
   * at the same puzzle.
   */
  undos: number;
  rewinds: number;
  /** Whether two marks on this board have ever disagreed with each other. */
  conflicted: boolean;
  /** When the board was first opened, rather than when it was last written. */
  startedAt: number;
  /** Whether it has been put down and picked back up at least once. */
  resumed: boolean;
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
  /**
   * Hints asked for; null for games finished before there were any to ask for.
   * Told apart from a real zero on purpose — a game that could not have used a
   * hint is not a game played without one.
   */
  hintsAsked: number | null;
  /**
   * How the board was arrived at. Null on every game finished before the app
   * measured it — told apart from a real zero on purpose, the same way the
   * clues and the hints are: a game that could not have counted its undos is
   * not a game solved without taking a mark back.
   */
  undos: number | null;
  rewinds: number | null;
  /** Whether two marks ever disagreed with each other before it came out. */
  conflicted: boolean | null;
  /** When the board was opened, which with `finishedAt` gives how long it sat. */
  startedAt: number | null;
  /** Whether it was put down and picked back up on the way to being finished. */
  resumed: boolean | null;
  /** True when the player pressed "reveal" instead of solving it. */
  revealed: boolean;
  finishedAt: number;
}

export interface History {
  version: number;
  games: CompletedGame[];
}

/**
 * Which lessons have been walked to the end, ever.
 *
 * The tutorial itself does not read this — a lesson opens on an empty board
 * every time it is taken, which is what keeps it a lesson rather than a thing
 * with a tick against it. The record is written past the screen, for the
 * statistics and for what is built on them, and never handed back to it.
 */
export interface WalkedLessons {
  version: number;
  /** Lesson ids, each once, in no particular order. */
  lessons: string[];
}

export const WALKED_VERSION = 1;
export const EMPTY_WALKED: WalkedLessons = { version: WALKED_VERSION, lessons: [] };

export function reviveWalked(value: unknown): WalkedLessons | null {
  if (!isObject(value) || value.version !== WALKED_VERSION) return null;
  if (!Array.isArray(value.lessons)) return null;
  const lessons = value.lessons.filter((id): id is string => typeof id === 'string');
  return { version: WALKED_VERSION, lessons: [...new Set(lessons)] };
}

/** The record with one more lesson against it; unchanged if it is already there. */
export function withWalked(walked: WalkedLessons, lesson: string): WalkedLessons {
  if (walked.lessons.includes(lesson)) return walked;
  return { version: WALKED_VERSION, lessons: [...walked.lessons, lesson] };
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
  if (typeof value.hintsAsked !== 'number') return false;
  if (typeof value.undos !== 'number' || typeof value.rewinds !== 'number') return false;
  if (typeof value.conflicted !== 'boolean' || typeof value.resumed !== 'boolean') return false;
  if (typeof value.startedAt !== 'number') return false;
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
      hintsAsked: typeof game.hintsAsked === 'number' ? game.hintsAsked : null,
      difficulty: typeof game.difficulty === 'string' ? game.difficulty : game.sizeLabel,
      // Measured or not measured; never guessed. A game from before any of
      // these existed reads as null rather than as a nought it never earned.
      undos: typeof game.undos === 'number' ? game.undos : null,
      rewinds: typeof game.rewinds === 'number' ? game.rewinds : null,
      conflicted: typeof game.conflicted === 'boolean' ? game.conflicted : null,
      startedAt: typeof game.startedAt === 'number' ? game.startedAt : null,
      resumed: typeof game.resumed === 'boolean' ? game.resumed : null,
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
 * off by hand and a `hintsUsed` of its own, counting the hints of a feature
 * that no longer exists; those crossed-off clues are the ones they had read, so
 * they come across as the clues seen, and that old count is simply not read —
 * which is why what replaced it is called `hintsAsked` rather than reusing the
 * name. Nothing about the board itself changed, so the game resumes. A
 * version-1 save carried no undo stack, and comes across with an empty one —
 * the same board it would have resumed to before, with nothing behind it; a
 * version-2 save predates the hint and comes across at none asked.
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
    version: CARRIED_FORWARD.includes(value.version as number) ? SAVE_VERSION : value.version,
    marks,
    cluesSeen: seen.filter((index: unknown) => typeof index === 'number'),
    clueIndex: typeof value.clueIndex === 'number' ? value.clueIndex : null,
    history: history.slice(-SAVED_UNDO),
    hintsAsked: typeof value.hintsAsked === 'number' ? value.hintsAsked : 0,
    undos: typeof value.undos === 'number' ? value.undos : 0,
    rewinds: typeof value.rewinds === 'number' ? value.rewinds : 0,
    conflicted: typeof value.conflicted === 'boolean' ? value.conflicted : false,
    // A save from before the board knew when it was opened is dated backwards
    // from the clock: the game has had at least this long on it. That is later
    // than the truth rather than earlier, which is the safe way round — it can
    // only under-report how long a puzzle has been sat on, never invent time.
    startedAt:
      typeof value.startedAt === 'number'
        ? value.startedAt
        : startedFrom(value.updatedAt, value.seconds),
    resumed: typeof value.resumed === 'boolean' ? value.resumed : false,
  };
  return isSavedGame(migrated) ? migrated : null;
}

/** Where a save with no start time is taken to have begun. */
function startedFrom(updatedAt: unknown, seconds: unknown): number {
  const written = typeof updatedAt === 'number' ? updatedAt : Date.now();
  const played = typeof seconds === 'number' ? seconds : 0;
  return written - Math.max(0, played) * 1000;
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
  hintsAsked: number;
  undos: number;
  rewinds: number;
  conflicted: boolean;
  startedAt: number;
  resumed: boolean;
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
    hintsAsked: input.hintsAsked,
    undos: input.undos,
    rewinds: input.rewinds,
    conflicted: input.conflicted,
    startedAt: input.startedAt,
    resumed: input.resumed,
    revealed: input.revealed,
    finishedAt: input.finishedAt,
  };
}
