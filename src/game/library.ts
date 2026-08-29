/**
 * Which numbered game a player is looking at, and whether they have finished it.
 *
 * A puzzle is decided entirely by its seed and its shape, and generation is
 * deterministic, so "game 7 at Expert" names one puzzle for good. That makes the
 * numbered list a catalogue rather than a stored thing: nothing is written down
 * when a game is listed, and a game the player has finished is found by looking
 * for its seed and shape in the history they already keep.
 *
 * The daily challenge is the same trick with the seed handed to it by the
 * calendar instead of by the player.
 */
import type { CompletedGame } from './persistence';

/**
 * How many numbers a page of the list holds.
 *
 * Six, because the list stands in the half of the screen the title panel
 * leaves, and six numbers at the size the app sets a choice is what that half
 * holds without scrolling. A number you have to scroll to is a number you have
 * to look for; paging past it is one tap.
 */
export const PAGE_SIZE = 6;

/** The numbers on a page, counting from one. Page 0 is the first. */
export function pageNumbers(page: number, size = PAGE_SIZE): number[] {
  const first = page * size + 1;
  return Array.from({ length: size }, (_, index) => first + index);
}

/**
 * The finished game for a seed and shape, or null.
 *
 * The newest is the one that counts: a puzzle restarted and finished again is
 * the same game played twice, and the time to show beside it is the latest.
 * History is kept newest first, so the first match is that one.
 */
export function findCompleted(
  history: CompletedGame[],
  sizeId: string,
  seed: number,
): CompletedGame | null {
  return history.find((game) => game.sizeId === sizeId && game.seed === seed) ?? null;
}

/** Every finished game on a page, by its number, so a row can be drawn in one pass. */
export function completedOnPage(
  history: CompletedGame[],
  sizeId: string,
  numbers: number[],
): Map<number, CompletedGame> {
  const wanted = new Set(numbers);
  const found = new Map<number, CompletedGame>();
  for (const game of history) {
    // Newest first, so the first sighting of a number is the one to keep.
    if (game.sizeId === sizeId && wanted.has(game.seed) && !found.has(game.seed)) {
      found.set(game.seed, game);
    }
  }
  return found;
}

/**
 * The seed for a day's challenge: the date read straight off the calendar,
 * 20260829 for the 29th of August 2026.
 *
 * Every date gets its own number, which a product of the three parts could not
 * do — multiplied together, the 12th of February, the 8th of March and the 6th
 * of April all come to the year times 24, and would have handed out the same
 * puzzle three times a year. Packing the parts into their own columns instead
 * gives one seed per day and keeps them in order, so a later date is a larger
 * number.
 *
 * Months count from one here, the way a calendar says them rather than the way
 * `Date` stores them.
 */
export function dailySeed(date: Date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** A local calendar day as a comparable key: 2026-08-29. */
export function dayKey(date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The day's challenge at this shape, if it has been finished *today*.
 *
 * The seed names the date on its own now, so the day is checked as well to keep
 * the question literal rather than inferred — "finished today" is what is being
 * asked, and the seed space is shared with the numbered games, where a game
 * numbered 20260829 would otherwise answer for a date.
 */
export function dailyDone(
  history: CompletedGame[],
  sizeId: string,
  now: Date = new Date(),
): CompletedGame | null {
  const seed = dailySeed(now);
  const today = dayKey(now);
  return (
    history.find(
      (game) =>
        game.sizeId === sizeId && game.seed === seed && dayKey(new Date(game.finishedAt)) === today,
    ) ?? null
  );
}
