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
import type { ModeId } from './modes';
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

/**
 * How much a puzzle's number — or a day — is multiplied by to leave the
 * difficulty a column of its own. Ten, because there are four difficulties and
 * no prospect of ten.
 */
const DIFFICULTY_STEP = 10;

/**
 * Which column each difficulty takes.
 *
 * Written down rather than read off the order of `SIZES`, because a size added
 * or moved later would otherwise change what a seed already handed out means —
 * and a seed is the record of which puzzle somebody played.
 */
const DIFFICULTY_COLUMN: Record<string, number> = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4 };

function columnOf(sizeId: string): number {
  const column = DIFFICULTY_COLUMN[sizeId];
  if (column === undefined) throw new Error(`No seed column for size: ${sizeId}`);
  return column;
}

/**
 * And a column for the way it is being played, on the same principle.
 *
 * Pure Deduction and Classic logic are the same catalogue of numbers and not the
 * same games: the board does the bookkeeping in one and none of it in the other,
 * and a puzzle that suits one can be a slog in the other. Giving each its own
 * column makes game 7 at Advanced two puzzles rather than one played two ways —
 * and puts the mode in the seed, so a game picked back up knows how it was being
 * played without being told.
 */
const MODE_STEP = 10;
const MODE_COLUMN: Record<string, number> = { pure: 0, classic: 1 };

function modeColumnOf(mode: ModeId): number {
  const column = MODE_COLUMN[mode];
  if (column === undefined) throw new Error(`No seed column for mode: ${mode}`);
  return column;
}

/**
 * The seed behind a numbered game.
 *
 * The number is multiplied up and the difficulty dropped into the column that
 * makes: game 7 at Advanced is seed 71. The number alone used to be the whole
 * seed, and the seed is the only thing the generator is handed — so the first
 * thing it drew with it, the theme, came out the same at every difficulty, and
 * the four game 7s were one cast in one place at four sizes.
 *
 * The number is what the player picks and what the list counts in, so it stays
 * the number: the packing happens on the way to the generator and is undone by
 * `numberOn` on the way back.
 */
export function numberedSeed(number: number, sizeId: string, mode: ModeId): number {
  return (number * DIFFICULTY_STEP + columnOf(sizeId)) * MODE_STEP + modeColumnOf(mode);
}

/**
 * Which numbered game a seed is, at this difficulty, or null if it is not one
 * of them. A seed from another difficulty's column belongs to another list.
 */
export function numberOn(seed: number, sizeId: string, mode: ModeId): number | null {
  if (!Number.isInteger(seed) || seed % MODE_STEP !== modeColumnOf(mode)) return null;
  const packed = Math.floor(seed / MODE_STEP);
  if (packed % DIFFICULTY_STEP !== columnOf(sizeId)) return null;
  return Math.floor(packed / DIFFICULTY_STEP);
}

/**
 * Which way a numbered game was being played, read back out of its seed.
 *
 * `null` for a seed that is not a numbered game's — a daily's, most of all. A
 * daily has no mode column and never had one: there is one per difficulty per
 * day, and doubling that so the same date could be played twice would make a
 * daily something you can have another go at.
 */
export function modeOf(seed: number): ModeId | null {
  if (!Number.isInteger(seed) || looksDaily(seed)) return null;
  const found = Object.entries(MODE_COLUMN).find(([, column]) => column === seed % MODE_STEP);
  return (found?.[0] as ModeId) ?? null;
}

/**
 * Which numbered game a seed is, however it was being played.
 *
 * The list asks `numberOn` with a mode in hand, because a number on the Classic
 * page is only ticked off by a Classic game. A board in play has only its seed —
 * and the seed carries the mode, so here it is read back out rather than handed
 * down through every screen that wants to print "Puzzle 7".
 */
export function numberFor(seed: number, sizeId: string): number | null {
  const mode = modeOf(seed);
  return mode === null ? null : numberOn(seed, sizeId, mode);
}

/** How many puzzles in the run are finished, each counted once. */
export function completedInRange(
  history: CompletedGame[],
  sizeId: string,
  mode: ModeId,
  range: Range,
): number {
  const seen = new Set<number>();
  for (const game of history) {
    if (game.sizeId !== sizeId) continue;
    const number = numberOn(game.seed, sizeId, mode);
    if (number !== null && number >= range.first && number <= range.last) seen.add(number);
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
  mode: ModeId,
  number: number,
): CompletedGame | null {
  const seed = numberedSeed(number, sizeId, mode);
  return history.find((game) => game.sizeId === sizeId && game.seed === seed) ?? null;
}

/** Every finished game on a page, by its number, so a row can be drawn in one pass. */
export function completedOnPage(
  history: CompletedGame[],
  sizeId: string,
  mode: ModeId,
  numbers: number[],
): Map<number, CompletedGame> {
  const wanted = new Set(numbers);
  const found = new Map<number, CompletedGame>();
  for (const game of history) {
    if (game.sizeId !== sizeId) continue;
    const number = numberOn(game.seed, sizeId, mode);
    // Newest first, so the first sighting of a number is the one to keep.
    if (number !== null && wanted.has(number) && !found.has(number)) found.set(number, game);
  }
  return found;
}

/**
 * The day itself as a number: 20260829 for the 29th of August 2026.
 *
 * Every date gets its own number, which a product of the three parts could not
 * do — multiplied together, the 12th of February, the 8th of March and the 6th
 * of April all come to the year times 24, and would have handed out the same
 * puzzle three times a year. Packing the parts into their own columns instead
 * gives one number per day and keeps them in order, so a later date is a larger
 * one.
 *
 * Months count from one here, the way a calendar says them rather than the way
 * `Date` stores them.
 */
export function dayNumber(date: Date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * The seed for a day's challenge at one difficulty.
 *
 * The day is multiplied up and the difficulty dropped into the column that
 * makes: 202608291 is the 29th of August 2026 at Advanced. All four used to be
 * the bare day, which made them the same seed at four shapes — and since the
 * seed is the only thing the generator is given, the first thing it draws with
 * it is the theme. Four challenges a day, all in the same place, with the same
 * cast, differing only in how many of them there were. Now each is its own
 * puzzle.
 *
 * A column rather than a plain multiplier for the same reason the date is three
 * columns rather than a product: distinct inputs have to give distinct seeds,
 * and multiplying a day by 2 and another by 3 does not promise that. Here the
 * day is recovered by dividing and the difficulty by what is left over, so
 * nothing collides and nothing is lost.
 */
export function dailySeed(date: Date, sizeId: string): number {
  return dayNumber(date) * DIFFICULTY_STEP + columnOf(sizeId);
}

/** The date a day number stands for, read back out of its columns. */
function dateOf(day: number): Date {
  const year = Math.floor(day / 10000);
  const month = Math.floor((day % 10000) / 100);
  const date = day % 100;
  return new Date(year, month - 1, date);
}

/** Whether a number reads as a date the app has handed a challenge out for. */
function isDay(day: number): boolean {
  if (day < 2025_01_01 || day > 2100_12_31) return false;
  const date = dateOf(day);
  return Number.isFinite(date.getTime()) && dayNumber(date) === day;
}

/**
 * The day a seed stands for, or null when it is not a daily's.
 *
 * Two shapes are read. A seed handed out now carries the day in every column
 * but the last and the difficulty in that one. A seed from before the
 * difficulties were told apart is the bare day — four of them went out for each
 * date — and those are in people's histories for good, so they are still read.
 * The two cannot be confused: a seed of the new shape has an extra digit, which
 * puts it far past the last date the old shape can spell.
 */
function dayOf(seed: number): number | null {
  if (!Number.isInteger(seed)) return null;
  const packed = Math.floor(seed / DIFFICULTY_STEP);
  const column = seed % DIFFICULTY_STEP;
  if (Object.values(DIFFICULTY_COLUMN).includes(column) && isDay(packed)) return packed;
  return isDay(seed) ? seed : null;
}

/**
 * The date a daily seed stands for.
 *
 * A seed that does not unpack to a real date on the calendar is not a daily's,
 * whatever it looks like: a numbered game could in principle carry one, though
 * nobody has paged thirty million times to find it.
 */
export function dailyDate(seed: number): Date {
  return dateOf(dayOf(seed) ?? seed);
}

/**
 * Whether a seed reads as a date: a real day on the calendar, in the years the
 * app has been handing them out. The two kinds of game share one seed space,
 * and a game picked back up does not say which list it came from, so this is
 * how the finish knows to name it by its date.
 */
export function looksDaily(seed: number): boolean {
  return dayOf(seed) !== null;
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
  const seed = dailySeed(now, sizeId);
  // Today's, played this morning on a build from before the difficulties had
  // seeds of their own. The shape is matched either way, so the old seed cannot
  // answer for a difficulty other than the one it was played at.
  const before = dayNumber(now);
  const today = dayKey(now);
  return (
    history.find(
      (game) =>
        game.sizeId === sizeId &&
        (game.seed === seed || game.seed === before) &&
        dayKey(new Date(game.finishedAt)) === today,
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
    // Any of the four counts, so the seed is asked which day it is for rather
    // than matched against one difficulty's.
    if (dayOf(game.seed) === dayNumber(finished)) done.add(dayKey(finished));
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
