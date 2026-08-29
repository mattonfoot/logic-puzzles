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

/** How many numbers a page of the list holds. */
export const PAGE_SIZE = 12;

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
 * The seed for a day's challenge: the year times the month times the date.
 *
 * Months count from one here, the way a calendar says them rather than the way
 * `Date` stores them.
 */
export function dailySeed(date: Date = new Date()): number {
  return date.getFullYear() * (date.getMonth() + 1) * date.getDate();
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
 * The day is checked as well as the seed, because the seed alone cannot tell
 * one day from another: it is a product, so every date whose month times date
 * comes to the same number shares it — the 12th of February, the 8th of March
 * and the 6th of April all seed on the year times 24. Two of those days are the
 * same puzzle; they are not the same challenge, and finishing one does not
 * spend the other.
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
