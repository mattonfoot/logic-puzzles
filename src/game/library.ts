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
 * Five, because the list stands in the half of the screen the title panel
 * leaves, and five rows at the size the app sets every choice — the same size
 * as a door on the front page and a difficulty — is what that half holds with
 * the pager and the way back under them, on every iPhone the app is built for.
 * A number you have to scroll to is a number you have to look for; paging past
 * it is one tap.
 *
 * It is also the step the zoomed-out catalogue counts in, so a group is five
 * puzzles, then twenty-five, then a hundred and twenty-five.
 */
export const PAGE_SIZE = 5;

/** The numbers on a page, counting from one. Page 0 is the first. */
export function pageNumbers(page: number, size = PAGE_SIZE): number[] {
  const first = page * size + 1;
  return Array.from({ length: size }, (_, index) => first + index);
}

/**
 * Where the player is looking in the catalogue.
 *
 * Five numbers to a page makes the hundredth puzzle twenty taps away, so the
 * list can be zoomed out: at level 1 a page holds five *groups* of five puzzles
 * (1–5, 6–10, …), at level 2 five groups of twenty-five, and so on — the same
 * five rows and the same Previous and Next whatever the level, with each row
 * standing for `PAGE_SIZE ** level` puzzles. Pressing a group opens the page
 * of the level below that holds it, and the way out is the zoom button between
 * the two words. Level 0 is the puzzles themselves.
 */
export interface Catalogue {
  level: number;
  page: number;
}

/** Past this a row stands for over a thousand puzzles, which nobody needs. */
export const MAX_ZOOM = 3;

/** How many puzzles one row stands for at a level. */
export function span(level: number, size = PAGE_SIZE): number {
  return size ** level;
}

export interface Range {
  first: number;
  last: number;
}

/** The five rows on a page at a level, each the run of puzzles it stands for. */
export function rangesOn({ level, page }: Catalogue, size = PAGE_SIZE): Range[] {
  const each = span(level, size);
  return pageNumbers(page, size).map((row) => {
    const first = (row - 1) * each + 1;
    return { first, last: first + each - 1 };
  });
}

/** One level further out, on the page whose rows include the one being left. */
export function zoomOut({ level, page }: Catalogue, size = PAGE_SIZE): Catalogue {
  return { level: Math.min(MAX_ZOOM, level + 1), page: Math.floor(page / size) };
}

/** One level further in, on the page the pressed row stands for. */
export function zoomInto({ level, page }: Catalogue, row: number, size = PAGE_SIZE): Catalogue {
  return { level: Math.max(0, level - 1), page: page * size + row };
}

/** How many puzzles in the run are finished, each counted once. */
export function completedInRange(history: CompletedGame[], sizeId: string, range: Range): number {
  const seen = new Set<number>();
  for (const game of history) {
    if (game.sizeId === sizeId && game.seed >= range.first && game.seed <= range.last) {
      seen.add(game.seed);
    }
  }
  return seen.size;
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

/**
 * The date a daily seed stands for, read back out of its columns.
 *
 * A seed that does not unpack to a real date on the calendar is not a daily's,
 * whatever it looks like: a numbered game could in principle carry one, though
 * nobody has paged three million times to find it.
 */
export function dailyDate(seed: number): Date {
  const year = Math.floor(seed / 10000);
  const month = Math.floor((seed % 10000) / 100);
  const day = seed % 100;
  return new Date(year, month - 1, day);
}

/**
 * Whether a seed reads as a date: a real day on the calendar, in the years the
 * app has been handing them out. The two kinds of game share one seed space,
 * and a game picked back up does not say which list it came from, so this is
 * how the finish knows to name it by its date.
 */
export function looksDaily(seed: number): boolean {
  const date = dailyDate(seed);
  return (
    seed >= 2025_01_01 &&
    seed <= 2100_12_31 &&
    Number.isFinite(date.getTime()) &&
    dailySeed(date) === seed
  );
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

/**
 * How many days running a daily challenge has been finished, counting back
 * from today.
 *
 * A day counts when any of its four was finished on the day itself: the same
 * test `dailyDone` makes, one day at a time. Yesterday's keeps the run alive
 * while today is still in progress, the way the statistics' own streak does,
 * so the number does not drop to nothing over breakfast and come back at
 * lunch. Zero is the ordinary case, and the daily screen says nothing then;
 * this is a line for somebody who has one, not a nag for somebody who does
 * not.
 */
export function dailyStreak(history: CompletedGame[], now: Date = new Date()): number {
  const done = new Set<string>();
  for (const game of history) {
    const finished = new Date(game.finishedAt);
    if (game.seed === dailySeed(finished)) done.add(dayKey(finished));
  }
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!done.has(dayKey(day))) day.setDate(day.getDate() - 1);
  let run = 0;
  while (done.has(dayKey(day))) {
    run++;
    day.setDate(day.getDate() - 1);
  }
  return run;
}
