/**
 * What is wrong with one mark, said out loud.
 *
 * The board keeps its opinion of the player's marks to itself: shading is for
 * marks that disagree with *each other*, and a game that shaded a mark for
 * disagreeing with the answer would be handing the answer over. That holds
 * right up to the moment the board is full. At that point there is no square
 * left to work at, no blank for a clue to point at, and a player whose answer
 * is wrong but consistent has only one route on — read the clue that disagrees
 * with them and find the mark it disagrees with, unaided, on a board of marks
 * that all look equally settled.
 *
 * So a full board gets a Hint button on any clue it still contradicts, and this
 * is what it says. It names a square, says which way round the mark on it is,
 * and says what the clue on the table wants instead. Nothing here reads
 * `puzzle.solution`: every word of it comes from a clue the player has already
 * read and a mark they can already see, which is why it can be given away for
 * nothing.
 */
import { t } from '../i18n';
import type { Clue, Puzzle } from '../puzzle/types';
import { cellFromKey, getEntry, markKey, squareName, type Marks } from './board';
import { clueBreaks } from './clues';

export interface Hint {
  /** The squares to shade while it stands, by their mark keys. */
  keys: string[];
  /** What is wrong with one of them, and which mark has to move. */
  text: string;
}

/**
 * One mark this clue disagrees with, explained.
 *
 * A hand mark is preferred over one the board worked out, because a hand mark
 * is a mark the player can change. When only an automatic one is broken, the
 * square the clue is about is not the square to touch — the tick it was
 * derived from is — and the line says so and shades both.
 *
 * `null` when the clue has nothing to complain about, which on a full board
 * means the board has caught up with it.
 */
export function hintFor(clue: Clue, marks: Marks, puzzle: Puzzle): Hint | null {
  const breaks = clueBreaks(clue, marks, puzzle);
  if (breaks.length === 0) return null;

  const broken = breaks.find(({ cell }) => getEntry(marks, cell)?.source === 'hand') ?? breaks[0];
  const key = markKey(broken.cell);
  const square = squareName(puzzle, broken.cell);
  // How the mark is standing, which is the opposite of what the clue wants. The
  // two cases read differently enough — one tap to finish, two to start over —
  // that a single line covering both would cover neither.
  const standing = broken.mark === 'no' ? 'ticked' : 'crossed';

  const cause = marks[key]?.from;
  const causeCell = cause ? cellFromKey(cause) : null;
  if (cause && causeCell) {
    return {
      keys: [key, cause],
      text: t(`game.hint.${standing}From`, { square, cause: squareName(puzzle, causeCell) }),
    };
  }
  return { keys: [key], text: t(`game.hint.${standing}`, { square }) };
}
