/**
 * One go at a puzzle: the board, the way back through it, the clues read, and
 * the tallies the finish is measured by.
 *
 * This is everything Restart puts back and everything a save keeps, which is
 * why it is one thing rather than a dozen. What is on the screen around it —
 * which window is open, whether the highlight is on — belongs to the screen.
 */
import type { Puzzle, Clue } from '../puzzle/types';
import { clearMistakes, isSolvable, reconcile, type MarkOptions, type Marks } from './board';
import { SAVE_VERSION, SAVED_UNDO, type SavedGame } from './persistence';
import type { CompletionInput } from './usePersistence';

/** How many moves back the undo button can reach. */
export const UNDO_LIMIT = 200;

export interface Session {
  /** Bumped by Restart: the same puzzle, gone at again. */
  attempt: number;
  marks: Marks;
  /**
   * Every board the player has moved on from, newest last, so a move can be
   * taken back. The last few are saved with the game, so a board picked back up
   * can still be stepped back from — and Rewind, which walks this same stack,
   * has somewhere to walk to.
   */
  history: Marks[];
  /** Squares the board is pointing at for the moment; cleared by the next move. */
  pointing: Set<string>;
  /** The clue on the table. */
  clueIndex: number | null;
  /**
   * Every clue the player has asked to see, in the order they were handed
   * over. Reading one is the cost of a hint here, so this is what the
   * statistics count.
   */
  cluesSeen: Set<number>;
  /**
   * Clues written for this game after the puzzle's own ran out. They are saved
   * inside the puzzle, so a resumed game keeps the ones it was given.
   */
  extraClues: Clue[];
  /** How many times a clue has been asked what is wrong with the board. */
  hintsAsked: number;
  /**
   * How the board is being arrived at, rather than how long it is taking. It
   * is measured because only the board can see it, and rides with the save so
   * putting the puzzle down does not wipe the tally.
   */
  undos: number;
  rewinds: number;
  /**
   * Sticky: a board that has ever held two marks that cannot both be true is a
   * board that was wrong, whether or not it still is.
   */
  conflicted: boolean;
  startedAt: number;
  /**
   * True from the moment a board is picked back up, and it stays true: a game
   * put down once was put down, however it ends.
   */
  resumed: boolean;
}

/** A session on a fresh board, or on the one a save left. */
export function startSession(saved: SavedGame | null, now = Date.now()): Session {
  return {
    attempt: 0,
    marks: saved?.marks ?? {},
    history: saved?.history ?? [],
    pointing: new Set(),
    clueIndex: saved?.clueIndex ?? null,
    cluesSeen: new Set(saved?.cluesSeen ?? []),
    extraClues: [],
    hintsAsked: saved?.hintsAsked ?? 0,
    undos: saved?.undos ?? 0,
    rewinds: saved?.rewinds ?? 0,
    conflicted: saved?.conflicted ?? false,
    startedAt: saved?.startedAt ?? now,
    resumed: Boolean(saved),
  };
}

/** Where a rewind lands: the newest board in the history the answer can be reached from. */
export interface Rewind {
  /** That board, or null when nothing recorded is clean. */
  board: Marks | null;
  /** The history left once it has been walked back. */
  past: Marks[];
  /** How many moves it walked back. */
  steps: number;
}

/** Walks the history back until the answer is within reach again. */
export function findRewind(history: Marks[], puzzle: Puzzle, options: MarkOptions): Rewind {
  let past = history;
  let steps = 0;
  while (past.length > 0) {
    const candidate = reconcile(past[past.length - 1], options);
    past = past.slice(0, -1);
    steps++;
    if (isSolvable(candidate, puzzle)) return { board: candidate, past, steps };
  }
  return { board: null, past, steps };
}

export type SessionAction =
  /** A move, recorded so it can be taken back. */
  | { type: 'move'; change: (marks: Marks) => Marks }
  /** The board settings moved: the board is brought back in line with them. */
  | { type: 'reconcile'; options: MarkOptions }
  | { type: 'undo'; options: MarkOptions }
  /**
   * Back to where `findRewind` landed. When nothing recorded was clean — a
   * resumed board carries only its last few moves, and a mistake can be older
   * than that — the bad marks are taken off instead.
   */
  | { type: 'rewind'; to: Rewind; puzzle: Puzzle; options: MarkOptions }
  /** Point at these squares until the next move. */
  | { type: 'point'; keys: Iterable<string> }
  /** A clue handed over: put on the table, and counted as read. */
  | { type: 'read'; index: number }
  /** A clue written on the spot, handed over like any other. */
  | { type: 'write'; clue: Clue; index: number }
  /** Back or on through the clues already read; free. */
  | { type: 'turn'; index: number }
  /** A clue asked what is wrong with the board, and the square it named. */
  | { type: 'hint'; keys: Iterable<string> }
  | { type: 'conflicted' }
  /** The same puzzle, from a blank board. */
  | { type: 'restart'; now: number };

/** Nothing pointed at — the same nothing as before, if that is what there was. */
const unpointed = (session: Session) =>
  session.pointing.size === 0 ? session.pointing : new Set<string>();

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'move': {
      const next = action.change(session.marks);
      if (next === session.marks) {
        return session.pointing.size === 0 ? session : { ...session, pointing: new Set() };
      }
      return {
        ...session,
        pointing: unpointed(session),
        marks: next,
        history: [...session.history.slice(-(UNDO_LIMIT - 1)), session.marks],
      };
    }
    case 'reconcile':
      return { ...session, marks: reconcile(session.marks, action.options) };
    case 'undo': {
      if (session.history.length === 0) return session;
      return {
        ...session,
        pointing: unpointed(session),
        undos: session.undos + 1,
        history: session.history.slice(0, -1),
        // Reconciled on the way back in, so a board recorded while Auto ✕ was
        // on comes back the way the setting stands now.
        marks: reconcile(session.history[session.history.length - 1], action.options),
      };
    }
    case 'rewind':
      return {
        ...session,
        pointing: unpointed(session),
        rewinds: session.rewinds + 1,
        history: action.to.past,
        marks: action.to.board ?? clearMistakes(session.marks, action.puzzle, action.options),
      };
    case 'point':
      return { ...session, pointing: new Set(action.keys) };
    case 'read':
      return {
        ...session,
        clueIndex: action.index,
        cluesSeen: session.cluesSeen.has(action.index)
          ? session.cluesSeen
          : new Set(session.cluesSeen).add(action.index),
      };
    case 'write':
      return sessionReducer(
        { ...session, extraClues: [...session.extraClues, action.clue] },
        { type: 'read', index: action.index },
      );
    case 'turn':
      return { ...session, clueIndex: action.index };
    case 'hint':
      return { ...session, hintsAsked: session.hintsAsked + 1, pointing: new Set(action.keys) };
    case 'conflicted':
      return session.conflicted ? session : { ...session, conflicted: true };
    case 'restart':
      return { ...startSession(null, action.now), attempt: session.attempt + 1 };
  }
}

/** The session as the save keeps it. `puzzle` carries any clues written for it. */
export function saveOf(
  session: Session,
  puzzle: Puzzle,
  seconds: number,
  now = Date.now(),
): SavedGame {
  return {
    version: SAVE_VERSION,
    puzzle,
    marks: session.marks,
    cluesSeen: [...session.cluesSeen],
    clueIndex: session.clueIndex,
    history: session.history.slice(-SAVED_UNDO),
    hintsAsked: session.hintsAsked,
    undos: session.undos,
    rewinds: session.rewinds,
    conflicted: session.conflicted,
    startedAt: session.startedAt,
    resumed: session.resumed,
    seconds,
    updatedAt: now,
  };
}

/** The session as the history records a finish. */
export function completionOf(session: Session, seconds: number): CompletionInput {
  return {
    seconds,
    cluesUsed: session.cluesSeen.size,
    hintsAsked: session.hintsAsked,
    undos: session.undos,
    rewinds: session.rewinds,
    conflicted: session.conflicted,
    startedAt: session.startedAt,
    resumed: session.resumed,
    // Nothing reveals a board any more, so a finished one was always solved.
    revealed: false,
  };
}
