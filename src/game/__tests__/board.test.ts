import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  categoryPairs,
  cellFromKey,
  findHint,
  findMistakes,
  getMark,
  isSolved,
  markKey,
  nextMark,
  progress,
  setMark,
  solvedMarks,
  withAutoCrosses,
} from '../board';

const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[1], seed: 2024 });
const size = puzzle.size.items;

describe('marks', () => {
  it('keys a cell the same from either side', () => {
    expect(markKey({ c1: 2, i1: 1, c2: 0, i2: 3 })).toBe(markKey({ c1: 0, i1: 3, c2: 2, i2: 1 }));
  });

  it('cycles blank → cross → tick → blank', () => {
    expect(nextMark(undefined)).toBe('no');
    expect(nextMark('no')).toBe('yes');
    expect(nextMark('yes')).toBe(null);
  });

  it('reads a key back into the cell it names', () => {
    const cell = { c1: 0, i1: 3, c2: 2, i2: 1 };
    expect(cellFromKey(markKey(cell))).toEqual(cell);
    expect(cellFromKey('nonsense')).toBeNull();
  });

  it('records only what the player marked', () => {
    const marks = setMark({}, { c1: 0, i1: 1, c2: 1, i2: 2 }, 'yes');
    expect(Object.keys(marks)).toHaveLength(1);
    expect(setMark(marks, { c1: 0, i1: 1, c2: 1, i2: 2 }, null)).toEqual({});
  });
});

describe('crosses that follow from a tick', () => {
  const tick = { c1: 0, i1: 1, c2: 1, i2: 2 };

  it('crosses out the rest of the row and column', () => {
    const board = withAutoCrosses(setMark({}, tick, 'yes'), size);

    expect(getMark(board, tick)).toBe('yes');
    expect(getMark(board, { c1: 0, i1: 1, c2: 1, i2: 0 })).toBe('no');
    expect(getMark(board, { c1: 0, i1: 3, c2: 1, i2: 2 })).toBe('no');
    // Nothing outside that row and column.
    expect(getMark(board, { c1: 0, i1: 3, c2: 1, i2: 0 })).toBeUndefined();
    // And nothing in another pair's grid.
    expect(getMark(board, { c1: 0, i1: 1, c2: 2, i2: 2 })).toBeUndefined();
  });

  it('takes them away again when the tick is cycled back to blank', () => {
    const marks = setMark({}, tick, 'yes');
    const cleared = setMark(marks, tick, null);

    expect(withAutoCrosses(marks, size)).not.toEqual(cleared);
    expect(withAutoCrosses(cleared, size)).toEqual({});
  });

  it("keeps the player's own crosses when a tick is undone", () => {
    const byHand = { c1: 0, i1: 3, c2: 1, i2: 0 };
    const marks = setMark(setMark({}, tick, 'yes'), byHand, 'no');
    const cleared = setMark(marks, tick, null);

    expect(withAutoCrosses(cleared, size)).toEqual({ [markKey(byHand)]: 'no' });
  });

  it('keeps a hand-placed cross that a later tick would also imply', () => {
    const alsoImplied = { c1: 0, i1: 1, c2: 1, i2: 0 };
    const marks = setMark(setMark({}, alsoImplied, 'no'), tick, 'yes');

    expect(withAutoCrosses(setMark(marks, tick, null), size)).toEqual({
      [markKey(alsoImplied)]: 'no',
    });
  });

  it('lets a tick win over a cross the player put there first', () => {
    const marks = setMark(setMark({}, tick, 'no'), tick, 'yes');
    expect(getMark(withAutoCrosses(marks, size), tick)).toBe('yes');
  });

  it('follows every tick on the board', () => {
    const second = { c1: 0, i1: 3, c2: 1, i2: 0 };
    const board = withAutoCrosses(setMark(setMark({}, tick, 'yes'), second, 'yes'), size);

    expect(getMark(board, { c1: 0, i1: 3, c2: 1, i2: 2 })).toBe('no');
    expect(getMark(board, { c1: 0, i1: 1, c2: 1, i2: 0 })).toBe('no');
    expect(getMark(board, second)).toBe('yes');
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
      marks = setMark(marks, cell!, 'yes');
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
