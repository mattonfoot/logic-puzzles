import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  byHand,
  categoryPairs,
  cellFromKey,
  clearMistakes,
  findMistakes,
  getEntry,
  getMark,
  isSolvable,
  isSolved,
  correctItem,
  markKey,
  nextMark,
  progress,
  reconcile,
  setMark,
  solvedMarks,
  type Marks,
} from '../board';

const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[1], seed: 2024 });
const size = puzzle.size.items;
const options = { size };

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

  it("records a cross as the player's own", () => {
    const cell = { c1: 0, i1: 1, c2: 1, i2: 2 };
    const marks = setMark({}, cell, 'no', options);

    expect(Object.keys(marks)).toHaveLength(1);
    expect(getEntry(marks, cell)).toEqual({ mark: 'no', source: 'hand' });
    expect(setMark(marks, cell, null, options)).toEqual({});
  });
});

describe('crosses that follow from a tick', () => {
  const tick = { c1: 0, i1: 1, c2: 1, i2: 2 };

  it('crosses out the rest of the row and column', () => {
    const board = setMark({}, tick, 'yes', options);

    expect(getEntry(board, tick)).toEqual({ mark: 'yes', source: 'hand' });
    expect(getEntry(board, { c1: 0, i1: 1, c2: 1, i2: 0 })).toEqual({
      mark: 'no',
      source: 'auto',
      from: markKey(tick),
    });
    expect(getMark(board, { c1: 0, i1: 3, c2: 1, i2: 2 })).toBe('no');
    // Nothing outside that row and column.
    expect(getMark(board, { c1: 0, i1: 3, c2: 1, i2: 0 })).toBeUndefined();
    // And nothing in another pair's grid.
    expect(getMark(board, { c1: 0, i1: 1, c2: 2, i2: 2 })).toBeUndefined();
  });

  it('takes them away again when the tick is cycled back to blank', () => {
    const marks = setMark({}, tick, 'yes', options);
    expect(Object.keys(marks).length).toBeGreaterThan(1);
    expect(setMark(marks, tick, null, options)).toEqual({});
  });

  it("keeps the player's own crosses when a tick is undone", () => {
    const own = { c1: 0, i1: 3, c2: 1, i2: 0 };
    const marks = setMark(setMark({}, tick, 'yes', options), own, 'no', options);

    expect(setMark(marks, tick, null, options)).toEqual({ [markKey(own)]: byHand('no') });
  });

  it('keeps a hand cross the tick would also have made', () => {
    const shared = { c1: 0, i1: 1, c2: 1, i2: 0 };
    const marks = setMark(setMark({}, shared, 'no', options), tick, 'yes', options);

    // The tick does not claim a square the player had already crossed…
    expect(getEntry(marks, shared)).toEqual(byHand('no'));
    // …so undoing the tick leaves it behind.
    expect(setMark(marks, tick, null, options)).toEqual({ [markKey(shared)]: byHand('no') });
  });

  it('lets a tick win over a cross the player put there first', () => {
    const marks = setMark(setMark({}, tick, 'no', options), tick, 'yes', options);
    expect(getEntry(marks, tick)).toEqual(byHand('yes'));
  });

  it('follows every tick on the board', () => {
    const second = { c1: 0, i1: 3, c2: 1, i2: 0 };
    const board = setMark(setMark({}, tick, 'yes', options), second, 'yes', options);

    // Both ticks rule this square out; the first one to reach it owns it.
    const shared = { c1: 0, i1: 3, c2: 1, i2: 2 };
    expect(getEntry(board, shared)).toEqual({ mark: 'no', source: 'auto', from: markKey(tick) });
    expect(getMark(board, { c1: 0, i1: 1, c2: 1, i2: 0 })).toBe('no');
    expect(getMark(board, second)).toBe('yes');

    // Taking that tick away leaves the square crossed, now on the other tick's account.
    const rest = setMark(board, tick, null, options);
    expect(getEntry(rest, shared)).toEqual({ mark: 'no', source: 'auto', from: markKey(second) });
  });

  it('leaves the board alone when automatic crosses are off', () => {
    const marks = setMark({}, tick, 'yes', { size, autoEliminate: false });
    expect(marks).toEqual({ [markKey(tick)]: byHand('yes') });
  });
});

describe('reconcile', () => {
  const tick = { c1: 0, i1: 1, c2: 1, i2: 2 };

  it('strips the automatic crosses when they are switched off', () => {
    const withAuto = setMark({}, tick, 'yes', options);
    expect(reconcile(withAuto, { size, autoEliminate: false })).toEqual({
      [markKey(tick)]: byHand('yes'),
    });
  });

  it('puts them back when they are switched on again', () => {
    const withAuto = setMark({}, tick, 'yes', options);
    const without = reconcile(withAuto, { size, autoEliminate: false });
    expect(reconcile(without, options)).toEqual(withAuto);
  });

  it('never overwrites a hand mark', () => {
    const own = { c1: 0, i1: 1, c2: 1, i2: 0 };
    const marks = setMark(setMark({}, tick, 'yes', options), own, 'no', options);
    expect(getEntry(reconcile(marks, options), own)).toEqual(byHand('no'));
  });
});

describe('whether the answer is still reachable', () => {
  const right = { c1: 0, i1: 0, c2: 1, i2: correctItem(puzzle, 0, 0, 1) };
  const wrong = { c1: 0, i1: 0, c2: 1, i2: (correctItem(puzzle, 0, 0, 1) + 1) % size };

  it('holds while every mark agrees with the answer', () => {
    expect(isSolvable({}, puzzle)).toBe(true);
    expect(isSolvable(setMark({}, right, 'yes', options), puzzle)).toBe(true);
    expect(isSolvable(solvedMarks(puzzle), puzzle)).toBe(true);
  });

  it('fails on a tick the answer contradicts', () => {
    expect(isSolvable(setMark({}, wrong, 'yes', options), puzzle)).toBe(false);
  });

  it('fails on a cross over a pairing that is true', () => {
    expect(isSolvable(setMark({}, right, 'no', options), puzzle)).toBe(false);
  });

  it('takes the contradicting marks off and leaves the rest', () => {
    const other = { c1: 0, i1: 1, c2: 2, i2: correctItem(puzzle, 0, 1, 2) };
    const board = setMark(setMark({}, other, 'yes', options), wrong, 'yes', options);
    expect(isSolvable(board, puzzle)).toBe(false);

    const cleaned = clearMistakes(board, puzzle, options);
    expect(isSolvable(cleaned, puzzle)).toBe(true);
    expect(getMark(cleaned, other)).toBe('yes');
    expect(getMark(cleaned, wrong)).toBeUndefined();
  });

  it('leaves a board that was already fine alone', () => {
    const board = setMark({}, right, 'yes', options);
    expect(clearMistakes(board, puzzle, options)).toEqual(board);
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
    const wrong = markKey({ c1: 0, i1: 0, c2: 1, i2: wrongItem });
    const marks = { ...solution, [wrong]: byHand('yes') };
    expect(findMistakes(marks, puzzle)).toContain(wrong);
    expect(isSolved(marks, puzzle)).toBe(false);
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

describe('ticks that follow from other ticks', () => {
  const facts = { size, autoFacts: true };
  const a1 = { c1: 0, i1: 1 };
  const b3 = { c2: 1, i2: 3 };
  const link = { ...a1, ...b3 };
  const chain = { c1: 1, i1: 3, c2: 2, i2: 2 };
  const implied = { c1: 0, i1: 1, c2: 2, i2: 2 };

  it('is off unless it is asked for', () => {
    // Neither tick's own grid touches the square the chain implies, so with the
    // setting off it stays blank.
    const board = setMark(setMark({}, link, 'yes', options), chain, 'yes', options);
    expect(getMark(board, implied)).toBeUndefined();
  });

  it('carries a pairing across a shared entity', () => {
    const board = setMark(setMark({}, link, 'yes', facts), chain, 'yes', facts);

    expect(getEntry(board, implied)).toEqual({
      mark: 'yes',
      source: 'auto',
      from: markKey(chain),
    });
  });

  it('works in either direction round the chain', () => {
    // A goes with B and A goes with C, so B goes with C.
    const alsoA = { c1: 0, i1: 1, c2: 2, i2: 2 };
    const board = setMark(setMark({}, link, 'yes', facts), alsoA, 'yes', facts);
    expect(getMark(board, chain)).toBe('yes');
  });

  it('crosses out the rows and columns of the ticks it worked out', () => {
    const board = setMark(setMark({}, link, 'yes', facts), chain, 'yes', facts);
    // The implied tick rules the rest of its own row out too.
    expect(getMark(board, { c1: 0, i1: 1, c2: 2, i2: 0 })).toBe('no');
    expect(getMark(board, { c1: 0, i1: 3, c2: 2, i2: 2 })).toBe('no');
  });

  it('never writes over a square the player marked', () => {
    const board = setMark(
      setMark(setMark({}, implied, 'no', facts), link, 'yes', facts),
      chain,
      'yes',
      facts,
    );
    expect(getEntry(board, implied)).toEqual(byHand('no'));
  });

  it('takes the worked-out ticks away again when it is switched off', () => {
    const board = setMark(setMark({}, link, 'yes', facts), chain, 'yes', facts);
    expect(getMark(board, implied)).toBe('yes');

    const without = reconcile(board, options);
    expect(getMark(without, implied)).toBeUndefined();
    expect(reconcile(without, facts)).toEqual(board);
  });

  it('leaves a lone tick with nothing to chain to alone', () => {
    expect(setMark({}, link, 'yes', facts)).toEqual(setMark({}, link, 'yes', options));
  });
});
