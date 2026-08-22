import { sizeFor } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  categoryPairs,
  findHint,
  findMistakes,
  getMark,
  isSolved,
  markKey,
  nextMark,
  progress,
  setMark,
  solvedMarks,
} from '../board';

const puzzle = generatePuzzle({ theme: THEMES[0], size: sizeFor(4, 4), seed: 2024 });
const size = puzzle.size.items;

describe('marks', () => {
  it('keys a cell the same from either side', () => {
    expect(markKey({ c1: 2, i1: 1, c2: 0, i2: 3 })).toBe(markKey({ c1: 0, i1: 3, c2: 2, i2: 1 }));
  });

  it('cycles blank → yes → no → blank', () => {
    expect(nextMark(undefined)).toBe('yes');
    expect(nextMark('yes')).toBe('no');
    expect(nextMark('no')).toBe(null);
  });

  it('crosses out the rest of the row and column when auto-eliminating', () => {
    const marks = setMark({}, { c1: 0, i1: 1, c2: 1, i2: 2 }, 'yes', { size });
    expect(getMark(marks, { c1: 0, i1: 1, c2: 1, i2: 2 })).toBe('yes');
    expect(getMark(marks, { c1: 0, i1: 1, c2: 1, i2: 0 })).toBe('no');
    expect(getMark(marks, { c1: 0, i1: 3, c2: 1, i2: 2 })).toBe('no');
    // Untouched rows stay blank.
    expect(getMark(marks, { c1: 0, i1: 3, c2: 1, i2: 0 })).toBeUndefined();
  });

  it('leaves neighbours alone when auto-elimination is off', () => {
    const marks = setMark({}, { c1: 0, i1: 1, c2: 1, i2: 2 }, 'yes', {
      size,
      autoEliminate: false,
    });
    expect(Object.keys(marks)).toHaveLength(1);
  });
});

describe('board state', () => {
  it('counts a fully revealed board as solved with no mistakes', () => {
    const marks = solvedMarks(puzzle);
    expect(isSolved(marks, puzzle)).toBe(true);
    expect(findMistakes(marks, puzzle)).toHaveLength(0);
    expect(progress(marks, puzzle)).toBe(1);
  });

  it('spots a wrong tick', () => {
    const solution = solvedMarks(puzzle);
    const wrongItem = (puzzle.solution[1][0] + 1) % size;
    const marks = { ...solution, [markKey({ c1: 0, i1: 0, c2: 1, i2: wrongItem })]: 'yes' as const };
    expect(findMistakes(marks, puzzle)).toContain(markKey({ c1: 0, i1: 0, c2: 1, i2: wrongItem }));
    expect(isSolved(marks, puzzle)).toBe(false);
  });

  it('hints only at pairings that are actually true', () => {
    let marks = {};
    let guard = 0;
    while (!isSolved(marks, puzzle) && guard++ < 200) {
      const cell = findHint(marks, puzzle, () => 0);
      expect(cell).not.toBeNull();
      marks = setMark(marks, cell!, 'yes', { size });
    }
    expect(isSolved(marks, puzzle)).toBe(true);
    expect(findHint(marks, puzzle, () => 0)).toBeNull();
  });

  it('lists one grid per pair of categories', () => {
    expect(categoryPairs(4)).toHaveLength(6);
    expect(categoryPairs(3)).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
  });
});
