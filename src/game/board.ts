/**
 * The player's board: what they have ticked or crossed on each pair grid.
 *
 * Marks are stored flat, keyed by the two (category, item) coordinates with the
 * lower category first, so `(0,2) x (3,1)` and `(3,1) x (0,2)` are one cell.
 */
import type { Puzzle } from '../puzzle/types';

export type Mark = 'yes' | 'no';
export type Marks = Record<string, Mark>;

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

export function getMark(marks: Marks, cell: Cell): Mark | undefined {
  return marks[markKey(cell)];
}

/** All category pairs, in the order the tabs show them. */
export function categoryPairs(categoryCount: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let c1 = 0; c1 < categoryCount; c1++) {
    for (let c2 = c1 + 1; c2 < categoryCount; c2++) pairs.push([c1, c2]);
  }
  return pairs;
}

interface SetMarkOptions {
  /** Ticking a cell crosses out the rest of its row and column. */
  autoEliminate?: boolean;
  size: number;
}

export function setMark(
  marks: Marks,
  cell: Cell,
  mark: Mark | null,
  { autoEliminate = true, size }: SetMarkOptions,
): Marks {
  const next = { ...marks };
  const key = markKey(cell);
  if (mark === null) delete next[key];
  else next[key] = mark;

  if (mark === 'yes' && autoEliminate) {
    const { c1, i1, c2, i2 } = normalise(cell);
    for (let item = 0; item < size; item++) {
      if (item !== i2) next[markKey({ c1, i1, c2, i2: item })] = 'no';
      if (item !== i1) next[markKey({ c1, i1: item, c2, i2 })] = 'no';
    }
  }

  return next;
}

/** Cycles a cell through blank → tick → cross → blank. */
export function nextMark(current: Mark | undefined): Mark | null {
  if (current === undefined) return 'yes';
  if (current === 'yes') return 'no';
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

export function solvedMarks(puzzle: Puzzle): Marks {
  const marks: Marks = {};
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        marks[markKey({ c1, i1, c2, i2 })] = isCorrectPair(puzzle, { c1, i1, c2, i2 })
          ? 'yes'
          : 'no';
      }
    }
  }
  return marks;
}
