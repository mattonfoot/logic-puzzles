import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import {
  byHand,
  categoryPairs,
  cellFromKey,
  clearMistakes,
  findConflicts,
  findMistakes,
  getEntry,
  getMark,
  isFull,
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

/**
 * What the game is allowed to notice about the player's marks.
 *
 * It used to be "does this disagree with the answer", which is the same thing
 * as telling them the answer: fill a grid in at random, read the red squares,
 * and the puzzle has solved itself. It is now "do these marks disagree with
 * each other" — something the player could have worked out unaided, and which
 * says nothing at all about which of them is the wrong one.
 */
describe('marks that disagree with each other', () => {
  /**
   * Marks laid down with the automation off, so a second tick can share a row
   * with the first — which is the contradiction being tested, and which the
   * automatic crosses would otherwise quietly prevent.
   */
  const bare = { size, autoEliminate: false };
  const right = { c1: 0, i1: 0, c2: 1, i2: correctItem(puzzle, 0, 0, 1) };
  const wrong = { c1: 0, i1: 0, c2: 1, i2: (correctItem(puzzle, 0, 0, 1) + 1) % size };

  it('says nothing about a board with nothing on it, or a finished one', () => {
    expect(findConflicts({}, puzzle)).toEqual([]);
    expect(findConflicts(solvedMarks(puzzle), puzzle)).toEqual([]);
    expect(isSolvable({}, puzzle)).toBe(true);
  });

  /**
   * The guarantee the whole change is for. One mark cannot contradict anything,
   * however wrong it is, so the board has nothing to say about it — and a
   * player filling squares in to see which turn red learns only that they have
   * not yet contradicted themselves.
   */
  it('says nothing about a single mark, however wrong it is', () => {
    expect(findConflicts(setMark({}, wrong, 'yes', options), puzzle)).toEqual([]);
    expect(findConflicts(setMark({}, right, 'no', options), puzzle)).toEqual([]);
    expect(isSolvable(setMark({}, wrong, 'yes', options), puzzle)).toBe(true);
  });

  /**
   * And the proof of it: the answer is not consulted. Given a puzzle whose
   * solution has been shuffled into a different one, the same marks come back
   * with the same verdict — which they could not if the solution were being
   * read.
   */
  it('gives the same answer on a puzzle with a different answer', () => {
    const shuffled = {
      ...puzzle,
      solution: puzzle.solution.map((row, category) => (category === 0 ? row : [...row].reverse())),
    };
    const boards = [
      setMark({}, wrong, 'yes', options),
      setMark({}, right, 'yes', options),
      solvedMarks(puzzle),
      setMark(
        setMark({}, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare),
        { c1: 0, i1: 0, c2: 1, i2: 1 },
        'yes',
        bare,
      ),
    ];
    for (const board of boards) {
      expect(findConflicts(board, shuffled).sort()).toEqual(findConflicts(board, puzzle).sort());
    }
  });

  /** One thing cannot be two things: two ticks in a row say it is. */
  it('catches two ticks in one row, and in one column', () => {
    // Laid down without the automatic crosses, which would otherwise refuse to
    // let the second tick share a row with the first.
    const row = setMark(
      setMark({}, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare),
      { c1: 0, i1: 0, c2: 1, i2: 1 },
      'yes',
      bare,
    );
    expect(findConflicts(row, puzzle).sort()).toEqual(
      [markKey({ c1: 0, i1: 0, c2: 1, i2: 0 }), markKey({ c1: 0, i1: 0, c2: 1, i2: 1 })].sort(),
    );

    const column = setMark(
      setMark({}, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare),
      { c1: 0, i1: 1, c2: 1, i2: 0 },
      'yes',
      bare,
    );
    expect(findConflicts(column, puzzle)).toHaveLength(2);
  });

  /**
   * The interesting one, and the one the player's own reasoning turns on: ticks
   * chain across grids. Two of them can pair one thing with two without either
   * being in the same grid as the other.
   */
  it('follows a chain of ticks onto another grid', () => {
    // 0.0 with 1.0, and 1.0 with 2.0 — so 0.0 is with 2.0. Ticking 0.0 with
    // 2.1 as well says it is with both.
    let board = setMark({}, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare);
    board = setMark(board, { c1: 1, i1: 0, c2: 2, i2: 0 }, 'yes', bare);
    expect(findConflicts(board, puzzle)).toEqual([]);

    board = setMark(board, { c1: 0, i1: 0, c2: 2, i2: 1 }, 'yes', bare);
    const caught = findConflicts(board, puzzle);
    expect(caught).toContain(markKey({ c1: 0, i1: 0, c2: 2, i2: 1 }));
    expect(caught.length).toBeGreaterThan(1);
  });

  /** A cross laid across a chain that has just said those two are the same. */
  it('catches a cross over a pairing the ticks have already made', () => {
    let board = setMark({}, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare);
    board = setMark(board, { c1: 1, i1: 0, c2: 2, i2: 0 }, 'yes', bare);
    board = setMark(board, { c1: 0, i1: 0, c2: 2, i2: 0 }, 'no', bare);

    const caught = findConflicts(board, puzzle);
    // The cross, and both ticks that make it impossible.
    expect(caught.sort()).toEqual(
      [
        markKey({ c1: 0, i1: 0, c2: 2, i2: 0 }),
        markKey({ c1: 0, i1: 0, c2: 1, i2: 0 }),
        markKey({ c1: 1, i1: 0, c2: 2, i2: 0 }),
      ].sort(),
    );
  });

  /** Everything pairs with exactly one thing, so a row of crosses is a lie. */
  it('catches a row crossed right through', () => {
    let board: Marks = {};
    for (let item = 0; item < size; item++) {
      board = setMark(board, { c1: 0, i1: 0, c2: 1, i2: item }, 'no', bare);
    }
    expect(findConflicts(board, puzzle)).toHaveLength(size);
    expect(isSolvable(board, puzzle)).toBe(false);
  });

  it('takes the disagreeing marks off and leaves the rest', () => {
    const other = { c1: 0, i1: 1, c2: 2, i2: correctItem(puzzle, 0, 1, 2) };
    let board = setMark({}, other, 'yes', options);
    board = setMark(board, { c1: 0, i1: 0, c2: 1, i2: 0 }, 'yes', bare);
    board = setMark(board, { c1: 0, i1: 0, c2: 1, i2: 1 }, 'yes', bare);
    expect(isSolvable(board, puzzle)).toBe(false);

    const cleaned = clearMistakes(board, puzzle, options);
    expect(isSolvable(cleaned, puzzle)).toBe(true);
    // The mark that had nothing to do with the disagreement stays.
    expect(getMark(cleaned, other)).toBe('yes');
  });

  it('leaves a board that was already agreeing with itself alone', () => {
    const board = setMark({}, right, 'yes', options);
    expect(clearMistakes(board, puzzle, options)).toEqual(board);
  });

  /**
   * The cheat, run the way a cheat would run it: scatter ticks over the grids
   * and read the red squares.
   *
   * What has to be true is not that nothing lights up — a scattered board
   * contradicts itself constantly — but that what stays *unlit* is not a list
   * of right answers. On board after board there are marks the solution
   * disagrees with that the game says nothing about, which is what makes the
   * absence of shading worth nothing to somebody guessing.
   */
  it('leaves wrong marks unlit, so the quiet squares are worth nothing', () => {
    let boardsHidingSomethingWrong = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let state = seed;
      const roll = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
      let marks: Marks = {};
      for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
        for (let i1 = 0; i1 < size; i1++) {
          for (let i2 = 0; i2 < size; i2++) {
            if (roll() < 0.25) marks = setMark(marks, { c1, i1, c2, i2 }, 'yes', bare);
          }
        }
      }
      const lit = new Set(findConflicts(marks, puzzle));
      const untrue = new Set(findMistakes(marks, puzzle));
      if (Object.keys(marks).some((key) => untrue.has(key) && !lit.has(key))) {
        boardsHidingSomethingWrong += 1;
      }
    }
    expect(boardsHidingSomethingWrong).toBeGreaterThan(150);
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

  /**
   * The gap between full and solved is where the hint lives, so it is written
   * down here: a board can carry every mark it has room for, hold together,
   * and still be somebody else's answer.
   */
  it('calls a board full when every square carries a mark, right or not', () => {
    expect(isFull({}, puzzle)).toBe(false);

    const solution = solvedMarks(puzzle);
    expect(isFull(solution, puzzle)).toBe(true);

    // One square rubbed out, and it is not full any more.
    const short = { ...solution };
    delete short[markKey({ c1: 0, i1: 0, c2: 1, i2: 0 })];
    expect(isFull(short, puzzle)).toBe(false);

    // Two sets swapped over: every square still marked, no two marks
    // disagreeing, and the answer wrong.
    let swapped: Marks = {};
    const shifted = (item: number) => (item + 1) % size;
    for (let entity = 0; entity < size; entity++) {
      for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
        const i1 = c1 === 1 ? shifted(puzzle.solution[c1][entity]) : puzzle.solution[c1][entity];
        const i2 = c2 === 1 ? shifted(puzzle.solution[c2][entity]) : puzzle.solution[c2][entity];
        swapped = setMark(swapped, { c1, i1, c2, i2 }, 'yes', { size, autoEliminate: true });
      }
    }
    expect(isFull(swapped, puzzle)).toBe(true);
    expect(findConflicts(swapped, puzzle)).toHaveLength(0);
    expect(isSolved(swapped, puzzle)).toBe(false);
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
