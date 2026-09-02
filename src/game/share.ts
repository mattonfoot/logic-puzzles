import { Share } from 'react-native';

import { t } from '../i18n';
import type { Puzzle } from '../puzzle/types';
import { formatDuration } from './time';
import { dailyDate } from './library';

/**
 * A finished game as a few lines somebody can be sent.
 *
 * What is in it: which puzzle — the date for a daily, the number for a
 * numbered game — the difficulty, the clock, and the clues read as a row of
 * squares. What is not: anything about the answer. The squares are the
 * puzzle's own clues, filled for the ones read and empty for the ones that were
 * not needed, with a yellow one for each clue the board had to write past the
 * end; how many clues a puzzle has is not a spoiler, and how many it took is
 * the whole of what there is to compare.
 */
export interface Result {
  puzzle: Puzzle;
  seconds: number;
  cluesUsed: number;
  /** Today's challenge rather than a numbered game: named by its date. */
  daily: boolean;
}

const READ = '🟩';
const UNREAD = '⬜';
const WRITTEN = '🟨';

export function clueSquares(cluesUsed: number, total: number): string {
  const read = Math.min(cluesUsed, total);
  return (
    READ.repeat(read) + WRITTEN.repeat(Math.max(0, cluesUsed - read)) + UNREAD.repeat(total - read)
  );
}

/** "2 September 2026", the way the date is said rather than written. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function resultText({ puzzle, seconds, cluesUsed, daily }: Result): string {
  const heading = daily
    ? t('share.daily', {
        date: formatDate(dailyDate(puzzle.seed)),
        difficulty: puzzle.size.difficulty,
      })
    : t('share.numbered', { difficulty: puzzle.size.difficulty, number: puzzle.seed });
  const line = t('share.line', { clock: formatDuration(seconds), clues: cluesUsed });
  return [heading, line, clueSquares(cluesUsed, puzzle.clues.length)].join('\n');
}

/**
 * Hands the text to the system share sheet. Whether anything is sent, and
 * where, is the player's business from there; a device with nothing to share
 * to, or one that closes the sheet, costs nothing.
 */
export async function shareResult(result: Result): Promise<void> {
  try {
    await Share.share({ message: resultText(result) });
  } catch {
    // Nothing to share to, or the sheet was put away. Either is fine.
  }
}
