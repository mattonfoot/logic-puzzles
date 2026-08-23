/**
 * The player's board: what they have ticked or crossed on each pair grid.
 *
 * Marks are stored flat, keyed by the two (category, item) coordinates with the
 * lower category first, so `(0,2) x (3,1)` and `(3,1) x (0,2)` are one cell.
 *
 * Every entry records who put it there. A mark the player made is `hand`; a
 * cross the board added because a tick rules out the rest of its row and column
 * is `auto`, and remembers the tick it came `from`. That distinction is what
 * keeps the two apart: automation never touches a hand mark, and taking a tick
 * away takes only the crosses that tick added.
 */
import type { Puzzle } from '../puzzle/types';

export type Mark = 'yes' | 'no';
export type MarkSource = 'hand' | 'auto';

export interface MarkEntry {
  mark: Mark;
  source: MarkSource;
  /** Auto crosses only: the key of the tick that put this here. */
  from?: string;
}

export type Marks = Record<string, MarkEntry>;

/** A mark the player made themselves. */
export const byHand = (mark: Mark): MarkEntry => ({ mark, source: 'hand' });

export interface Cell {
  c1: number;
  i1: number;
  c2: number;
  i2: number;
}

export function normalise(cell: Cell): Cell {
  return cell.c1 <= cell.c2
    ? cell
    : { c1: cell.c2, i1: cell.i2, c2: cell.c1, i2: cell.i1 };
}

export function markKey(cell: Cell): string {
  const { c1, i1, c2, i2 } = normalise(cell);
  return `${c1}.${i1}-${c2}.${i2}`;
}

const KEY = /^(\d+)\.(\d+)-(\d+)\.(\d+)$/;

export function cellFromKey(key: string): Cell | null {
  const match = KEY.exec(key);
  if (!match) return null;
  const [c1, i1, c2, i2] = match.slice(1).map(Number);
  return { c1, i1, c2, i2 };
}

export function getEntry(marks: Marks, cell: Cell): MarkEntry | undefined {
  return marks[markKey(cell)];
}

export function getMark(marks: Marks, cell: Cell): Mark | undefined {
  return marks[markKey(cell)]?.mark;
}

/** All category pairs, in the order the tabs show them. */
export function categoryPairs(categoryCount: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let c1 = 0; c1 < categoryCount; c1++) {
    for (let c2 = c1 + 1; c2 < categoryCount; c2++) pairs.push([c1, c2]);
  }
  return pairs;
}

interface MarkOptions {
  size: number;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate?: boolean;
}

/**
 * Records what the player marked, then brings the automatic crosses back in
 * line. `null` takes their mark away again.
 */
export function setMark(
  marks: Marks,
  cell: Cell,
  mark: Mark | null,
  { size, autoEliminate = true }: MarkOptions,
): Marks {
  const next = { ...marks };
  const key = markKey(cell);
  if (mark === null) delete next[key];
  else next[key] = byHand(mark);
  return reconcile(next, { size, autoEliminate });
}

/**
 * Rebuilds the automatic crosses around whatever the player has marked.
 *
 * Hand marks are kept exactly as they are. Every hand tick then crosses out the
 * rest of its row and column, but only where the player has left the square
 * alone — so a cross made by hand is never overwritten, and one added for a
 * tick disappears with it.
 */
export function reconcile(marks: Marks, { size, autoEliminate = true }: MarkOptions): Marks {
  const next: Marks = {};
  for (const [key, entry] of Object.entries(marks)) {
    if (entry.source === 'hand') next[key] = entry;
  }
  if (!autoEliminate) return next;

  for (const [key, entry] of Object.entries(next)) {
    if (entry.mark !== 'yes') continue;
    const cell = cellFromKey(key);
    if (!cell) continue;

    const { c1, i1, c2, i2 } = cell;
    const cross = (target: Cell) => {
      const targetKey = markKey(target);
      if (!next[targetKey]) next[targetKey] = { mark: 'no', source: 'auto', from: key };
    };

    for (let item = 0; item < size; item++) {
      if (item !== i2) cross({ c1, i1, c2, i2: item });
      if (item !== i1) cross({ c1, i1: item, c2, i2 });
    }
  }

  return next;
}

/** Cycles a cell through blank → cross → tick → blank. */
export function nextMark(current: Mark | undefined): Mark | null {
  if (current === undefined) return 'no';
  if (current === 'no') return 'yes';
  return null;
}

export function correctItem(puzzle: Puzzle, c1: number, i1: number, c2: number): number {
  const entity = puzzle.solution[c1].indexOf(i1);
  return puzzle.solution[c2][entity];
}

export function isCorrectPair(puzzle: Puzzle, cell: Cell): boolean {
  return correctItem(puzzle, cell.c1, cell.i1, cell.c2) === cell.i2;
}

/** Cells whose mark contradicts the real solution. */
export function findMistakes(marks: Marks, puzzle: Puzzle): string[] {
  const mistakes: string[] = [];
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        const cell = { c1, i1, c2, i2 };
        const mark = getMark(marks, cell);
        if (!mark) continue;
        const truth = isCorrectPair(puzzle, cell) ? 'yes' : 'no';
        if (mark !== truth) mistakes.push(markKey(cell));
      }
    }
  }
  return mistakes;
}

/** Every true pairing is ticked and nothing false is. */
export function isSolved(marks: Marks, puzzle: Puzzle): boolean {
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        const cell = { c1, i1, c2, i2 };
        const mark = getMark(marks, cell);
        if (isCorrectPair(puzzle, cell)) {
          if (mark !== 'yes') return false;
        } else if (mark === 'yes') {
          return false;
        }
      }
    }
  }
  return true;
}

/** How much of the board is filled in correctly, as a 0–1 fraction. */
export function progress(marks: Marks, puzzle: Puzzle): number {
  const pairs = categoryPairs(puzzle.categories.length);
  const total = pairs.length * puzzle.size.items;
  let done = 0;
  for (const [c1, c2] of pairs) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      const i2 = correctItem(puzzle, c1, i1, c2);
      if (getMark(marks, { c1, i1, c2, i2 }) === 'yes') done++;
    }
  }
  return total === 0 ? 0 : done / total;
}

/** A true pairing the player has not found yet, for the hint button. */
export function findHint(marks: Marks, puzzle: Puzzle, roll: (max: number) => number): Cell | null {
  const options: Cell[] = [];
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      const cell = { c1, i1, c2, i2: correctItem(puzzle, c1, i1, c2) };
      if (getMark(marks, cell) !== 'yes') options.push(cell);
    }
  }
  if (options.length === 0) return null;
  return options[roll(options.length)];
}

/** The finished board, as though the player had marked every square. */
export function solvedMarks(puzzle: Puzzle): Marks {
  const marks: Marks = {};
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        marks[markKey({ c1, i1, c2, i2 })] = byHand(
          isCorrectPair(puzzle, { c1, i1, c2, i2 }) ? 'yes' : 'no',
        );
      }
    }
  }
  return marks;
}
