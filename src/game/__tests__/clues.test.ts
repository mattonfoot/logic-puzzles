import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { DEFAULT_CLUE_TEMPLATES } from '../../puzzle/describe';
import { clueKey, generatePuzzle } from '../../puzzle/generator';
import type { Clue, Puzzle } from '../../puzzle/types';
import { byHand, isSolved, markKey, setMark, solvedMarks, type Cell, type Marks } from '../board';
import { clueDone, clueMarks, cluesDone, inventClue, nextClue } from '../clues';

/**
 * Three heroes, three weapons, three rewards. Entity 0 is Kell with the Lance
 * and 90g, entity 1 Tamsin with the Sabre and 105g, entity 2 Ivo with the
 * Dagger and 165g.
 */
const puzzle: Puzzle = {
  seed: 1,
  clueTemplates: DEFAULT_CLUE_TEMPLATES,
  themeId: 'test',
  themeName: 'Test',
  themeEmoji: '🧪',
  accent: '#000000',
  size: { id: '3x3', items: 3, categories: 3, label: '3 × 3', difficulty: 'Beginner' },
  categories: [
    {
      id: 'hero',
      name: 'Hero',
      pattern: '{}',
      items: [{ label: 'Kell' }, { label: 'Tamsin' }, { label: 'Ivo' }],
    },
    {
      id: 'weapon',
      name: 'Weapon',
      pattern: 'the {}',
      items: [{ label: 'Sabre' }, { label: 'Dagger' }, { label: 'Lance' }],
    },
    {
      id: 'reward',
      name: 'Reward',
      pattern: '{}',
      items: [
        { label: '90g', value: 90 },
        { label: '105g', value: 105 },
        { label: '165g', value: 165 },
      ],
      ordered: { noun: 'reward', unit: 'gold', greater: 'larger', lesser: 'smaller' },
    },
  ],
  solution: [
    [0, 1, 2],
    [2, 0, 1],
    [0, 1, 2],
  ],
  clues: [],
};

const options = { size: 3, autoEliminate: false };
const cell = (c1: number, i1: number, c2: number, i2: number): Cell => ({ c1, i1, c2, i2 });
const keysOf = (clue: Clue, marks: Marks) =>
  clueMarks(clue, marks, puzzle)
    .map((required) => `${markKey(required.cell)}=${required.mark}`)
    .sort();

describe('what a link clue asks for', () => {
  const kellHasLance: Clue = {
    kind: 'link',
    positive: true,
    a: { category: 0, item: 0 },
    b: { category: 1, item: 2 },
  };
  const kellHasNoSabre: Clue = { ...kellHasLance, positive: false, b: { category: 1, item: 0 } };

  it('wants the tick, and nothing else', () => {
    expect(keysOf(kellHasLance, {})).toEqual(['0.0-1.2=yes']);
    expect(clueDone(kellHasLance, {}, puzzle)).toBe(false);
    expect(clueDone(kellHasLance, setMark({}, cell(0, 0, 1, 2), 'yes', options), puzzle)).toBe(
      true,
    );
  });

  it('is not finished by a cross where it wants a tick', () => {
    const crossed = setMark({}, cell(0, 0, 1, 2), 'no', options);
    expect(clueDone(kellHasLance, crossed, puzzle)).toBe(false);
  });

  it('wants the cross when it is a negative', () => {
    expect(keysOf(kellHasNoSabre, {})).toEqual(['0.0-1.0=no']);
    expect(clueDone(kellHasNoSabre, setMark({}, cell(0, 0, 1, 0), 'no', options), puzzle)).toBe(
      true,
    );
  });

  it('does not care who put the mark there', () => {
    // The cross an automatic tick left behind counts as much as a hand one.
    const board = setMark({}, cell(0, 0, 1, 2), 'yes', { size: 3, autoEliminate: true });
    expect(clueDone(kellHasNoSabre, board, puzzle)).toBe(true);
  });
});

describe('what an either-or clue asks for', () => {
  // "Kell carries either the Sabre or the Lance."
  const clue: Clue = {
    kind: 'either',
    a: { category: 0, item: 0 },
    options: [
      { category: 1, item: 0 },
      { category: 1, item: 2 },
    ],
  };

  it('rules out everything it leaves out', () => {
    expect(keysOf(clue, {})).toEqual(['0.0-1.1=no']);
  });

  it('names the other option once one is ruled out', () => {
    const board = setMark({}, cell(0, 0, 1, 0), 'no', options);
    expect(keysOf(clue, board)).toEqual(['0.0-1.1=no', '0.0-1.2=yes']);
    // Still something to say, so it stays on the table.
    expect(clueDone(clue, setMark(board, cell(0, 0, 1, 1), 'no', options), puzzle)).toBe(false);
  });

  it('is finished once the crosses are down and neither option is settled', () => {
    expect(clueDone(clue, setMark({}, cell(0, 0, 1, 1), 'no', options), puzzle)).toBe(true);
  });
});

describe('what a comparison asks for', () => {
  // "Kell's reward is larger than the Dagger's." Kell: 90g, Dagger: 165g — a
  // clue about the puzzle's shape, not about this solution.
  const clue: Clue = {
    kind: 'compare',
    order: 2,
    greater: { category: 0, item: 0 },
    lesser: { category: 1, item: 1 },
  };

  it('separates the two it compares, and rules out the ends of the scale', () => {
    // Kell cannot be the smallest reward, the Dagger cannot be the largest,
    // and the two cannot be the same hero.
    expect(keysOf(clue, {})).toEqual(['0.0-1.1=no', '0.0-2.0=no', '1.1-2.2=no']);
  });

  it('narrows again as the board fills in', () => {
    // The Dagger is not 90g either, so Kell cannot be 105g any more.
    const board = setMark({}, cell(1, 1, 2, 0), 'no', options);
    expect(keysOf(clue, board)).toContain('0.0-2.1=no');
    expect(clueDone(clue, board, puzzle)).toBe(false);
  });

  it('counts an exact gap rather than any old difference', () => {
    const gap: Clue = { ...clue, gap: 75 };
    // 165 − 90 is the only 75 in the set, so Kell is 165g and the Dagger 90g.
    expect(keysOf(gap, {})).toEqual([
      '0.0-1.1=no',
      '0.0-2.0=no',
      '0.0-2.1=no',
      '1.1-2.1=no',
      '1.1-2.2=no',
    ]);
  });
});

describe('the clue on the table', () => {
  const done = new Set([1, 3]);

  it('moves to the next one with something left to say', () => {
    expect(nextClue(null, done, 5)).toBe(0);
    expect(nextClue(0, done, 5)).toBe(2);
    expect(nextClue(2, done, 5)).toBe(4);
  });

  it('comes back round to a clue that was passed over', () => {
    expect(nextClue(4, done, 5)).toBe(0);
    // The last one standing stays put rather than turning into nothing.
    expect(nextClue(2, new Set([0, 1, 3, 4]), 5)).toBe(2);
  });

  it('has nothing to offer once every clue is used up', () => {
    expect(nextClue(1, new Set([0, 1, 2]), 3)).toBeNull();
  });
});

describe('a whole puzzle', () => {
  const sizes = [SIZES[0], SIZES[1], SIZES[2]];
  const puzzles = sizes.map((size, index) =>
    generatePuzzle({ theme: THEMES, size, seed: 7000 + index }),
  );

  it('starts with every clue still to be read', () => {
    for (const made of puzzles) {
      expect(cluesDone({}, made).size).toBe(0);
    }
  });

  it('leaves nothing unfinished once it is solved', () => {
    for (const made of puzzles) {
      expect(cluesDone(solvedMarks(made), made).size).toBe(made.clues.length);
    }
  });

  it('does not count a clue the board contradicts', () => {
    const made = puzzles[0];
    const clue = made.clues.find((one) => one.kind === 'link' && one.positive);
    if (!clue || clue.kind !== 'link') throw new Error('expected a positive link clue');

    const wrong: Marks = {
      [markKey({ c1: clue.a.category, i1: clue.a.item, c2: clue.b.category, i2: clue.b.item })]:
        byHand('no'),
    };
    expect(clueDone(clue, wrong, made)).toBe(false);
  });
});

describe('writing a clue when the puzzle runs out', () => {
  const made = generatePuzzle({ theme: THEMES, size: SIZES[0], seed: 7100 });
  const withExtras = (extras: Clue[]) => ({ ...made, clues: [...made.clues, ...extras] });

  it('says something true that the board does not already say', () => {
    const clue = inventClue(made, {}, 0);
    if (!clue) throw new Error('expected a clue');

    // True of the puzzle: the finished board agrees with it.
    expect(clueDone(clue, solvedMarks(made), made)).toBe(true);
    // Worth reading: the board it was written for does not.
    expect(clueDone(clue, {}, made)).toBe(false);
  });

  it('repeats neither itself nor the clues the puzzle came with', () => {
    const extras: Clue[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const clue = inventClue(withExtras(extras), {}, attempt);
      if (!clue) throw new Error('expected a clue');
      extras.push(clue);
    }

    const keys = [...made.clues, ...extras].map(clueKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has nothing to write for a board that is already finished', () => {
    expect(inventClue(made, solvedMarks(made), 0)).toBeNull();
  });

  it('carries a board all the way to the answer if the player keeps asking', () => {
    // Read every clue, mark what it asks for, and ask for another when they run
    // out: the written ones have to be enough to finish the puzzle on their own.
    const options = { size: made.size.items, autoEliminate: true, autoFacts: true };
    let board: Marks = {};
    let extras: Clue[] = [];

    for (let step = 0; step < 200 && !isSolved(board, made); step++) {
      const puzzleNow = withExtras(extras);
      const open = puzzleNow.clues.find((clue) => !clueDone(clue, board, puzzleNow));
      const clue = open ?? inventClue(puzzleNow, board, extras.length);
      if (!clue) break;
      if (!open) extras = [...extras, clue];

      for (const required of clueMarks(clue, board, puzzleNow)) {
        board = setMark(board, required.cell, required.mark, options);
      }
    }

    expect(isSolved(board, made)).toBe(true);
  });
});
