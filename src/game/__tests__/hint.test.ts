import { DEFAULT_CLUE_TEMPLATES } from '../../puzzle/describe';
import type { Clue, ItemDef, Puzzle } from '../../puzzle/types';
import { categoryPairs, setMark, type Cell, type Marks } from '../board';
import { clueBreaks } from '../clues';
import { hintFor } from '../hint';

/** A bare item: these tests are about what is said, not about the words. */
const item = (label: string): ItemDef => ({
  id: label.toLowerCase(),
  label,
  icon: 'test/thing',
  blurb: 'A thing that exists.',
  traits: {},
});

const category = (id: string, name: string, labels: string[]) => ({
  id,
  name,
  pattern: '{}',
  describes: 'the {}',
  noun: 'thing',
  traits: [],
  items: labels.map(item),
});

/**
 * Three heroes, three weapons, three rewards. The answer pairs Kell with the
 * Lance, Tamsin with the Sabre and Ivo with the Dagger.
 */
const puzzle: Puzzle = {
  seed: 1,
  clueTemplates: DEFAULT_CLUE_TEMPLATES,
  themeId: 'test',
  themeName: 'Test',
  themeIcon: 'test/theme',
  size: { id: '3x3', items: 3, categories: 3, label: '3 × 3', difficulty: 'Beginner' },
  categories: [
    category('hero', 'Hero', ['Kell', 'Tamsin', 'Ivo']),
    category('weapon', 'Weapon', ['Sabre', 'Dagger', 'Lance']),
    category('reward', 'Reward', ['Bronze', 'Silver', 'Gold']),
  ],
  solution: [
    [0, 1, 2],
    [2, 0, 1],
    [0, 1, 2],
  ],
  clues: [],
};

const cell = (c1: number, i1: number, c2: number, i2: number): Cell => ({ c1, i1, c2, i2 });
const HAND = { size: 3, autoEliminate: false };

/** Who holds what, one item of each set per entity, with every square filled. */
function boardOf(weapons: number[]): Marks {
  const assignment = [puzzle.solution[0], weapons, puzzle.solution[2]];
  let marks: Marks = {};
  for (const [c1, c2] of categoryPairs(3)) {
    for (let entity = 0; entity < 3; entity++) {
      marks = setMark(marks, cell(c1, assignment[c1][entity], c2, assignment[c2][entity]), 'yes', {
        size: 3,
        autoEliminate: true,
      });
    }
  }
  return marks;
}

/** Kell has the Sabre, Tamsin the Dagger, Ivo the Lance: full, and not the answer. */
const shuffled = boardOf([0, 1, 2]);

const kellHasLance: Clue = {
  kind: 'link',
  positive: true,
  a: { category: 0, item: 0 },
  b: { category: 1, item: 2 },
};
const kellHasNoSabre: Clue = { ...kellHasLance, positive: false, b: { category: 1, item: 0 } };

describe('the marks a clue is arguing with', () => {
  it('finds nothing on a board that agrees with it', () => {
    expect(clueBreaks(kellHasNoSabre, boardOf(puzzle.solution[1]), puzzle)).toHaveLength(0);
  });

  it('does not count a blank square as an argument', () => {
    // Nothing marked either way: the clue has not been acted on there, which
    // is not the same as being contradicted.
    expect(clueBreaks(kellHasLance, {}, puzzle)).toHaveLength(0);
  });

  it('finds the mark standing the other way round', () => {
    expect(clueBreaks(kellHasNoSabre, shuffled, puzzle)).toEqual([
      { cell: cell(0, 0, 1, 0), mark: 'no' },
    ]);
  });
});

describe('the hint a clue gives', () => {
  it('says nothing when the board has caught up with the clue', () => {
    expect(hintFor(kellHasNoSabre, boardOf(puzzle.solution[1]), puzzle)).toBeNull();
  });

  it('names the ticked square, and says which way to tap it', () => {
    const hint = hintFor(kellHasNoSabre, shuffled, puzzle);
    expect(hint?.text).toContain('Kell and Sabre');
    expect(hint?.text).toContain('is ticked');
    expect(hint?.text).toContain('Tap it twice');
    // Lit on the board behind the window as well as named in it.
    expect(hint?.keys).toEqual(['0.0-1.0']);
  });

  it('names the crossed square when the clue makes a pair of it', () => {
    const crossed = setMark({}, cell(0, 0, 1, 2), 'no', HAND);
    const hint = hintFor(kellHasLance, crossed, puzzle);
    expect(hint?.text).toContain('Kell and Lance');
    expect(hint?.text).toContain('is crossed');
    expect(hint?.text).toContain('hold the square down');
    expect(hint?.keys).toEqual(['0.0-1.2']);
  });

  /**
   * A cross the board put there is not a cross the player can usefully argue
   * with: the mark to move is the tick it came from, and pointing at the
   * square the clue names would send them to a square that is only doing what
   * their own tick told it to.
   */
  it('points at the tick an automatic mark came from, not at the mark itself', () => {
    const hint = hintFor(kellHasLance, shuffled, puzzle);
    expect(hint?.text).toContain('Kell and Lance');
    expect(hint?.text).toContain('because of your tick on Kell and Sabre');
    expect(hint?.text).toContain('earlier tick');
    // Both squares shaded: the one the clue is about, and the one to change.
    expect(hint?.keys).toEqual(['0.0-1.2', '0.0-1.0']);
  });

  it('prefers a mark the player made over one the board worked out', () => {
    // Kell has the Bronze and the Sabre has the Bronze, so Kell has the Sabre —
    // a tick the board writes for itself. The tick on Kell and the Lance is the
    // player's own.
    let marks = setMark({}, cell(0, 0, 2, 0), 'yes', { size: 3, autoFacts: true });
    marks = setMark(marks, cell(1, 0, 2, 0), 'yes', { size: 3, autoFacts: true });
    marks = setMark(marks, cell(0, 0, 1, 2), 'yes', { size: 3, autoFacts: true });
    expect(marks['0.0-1.0']).toEqual({ mark: 'yes', source: 'auto', from: expect.any(String) });

    // "No hero with a wooden weapon is Kell" — the Sabre and the Lance — which
    // both ticks break. The worked-out one comes first in the clue's own order.
    const wooden: Clue = {
      kind: 'groupNot',
      group: { category: 1, trait: 'material', value: 'wood', items: [0, 2] },
      b: { category: 0, item: 0 },
    };
    // The clue lists the group in its own order, and the worked-out tick is
    // the one it names first.
    expect(clueBreaks(wooden, marks, puzzle).map((broken) => broken.cell.i1)).toEqual([0, 2]);

    const hint = hintFor(wooden, marks, puzzle);
    expect(hint?.text).toContain('Kell and Lance');
    expect(hint?.keys).toEqual(['0.0-1.2']);
  });

  /**
   * The guarantee the whole thing rests on. A hint is given away for nothing
   * because everything in it is already on the screen — the clue overhead and
   * the marks under it. Read the answer for even one word of it and it would
   * be handing over a puzzle the player has not solved.
   */
  it('gives the same hint on a puzzle with a different answer', () => {
    const elsewhere: Puzzle = {
      ...puzzle,
      solution: [
        [0, 1, 2],
        [1, 2, 0],
        [2, 0, 1],
      ],
    };
    expect(hintFor(kellHasNoSabre, shuffled, elsewhere)).toEqual(
      hintFor(kellHasNoSabre, shuffled, puzzle),
    );
    expect(hintFor(kellHasLance, shuffled, elsewhere)).toEqual(
      hintFor(kellHasLance, shuffled, puzzle),
    );
  });
});
