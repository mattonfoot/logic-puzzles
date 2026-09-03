import { getMark, isSolved, nextMark, setMark, type Marks } from '../board';
import { STEPS, stepAt, stepDone, tutorialPuzzle } from '../tutorial';
import { describeClue } from '../../puzzle/describe';

const puzzle = tutorialPuzzle();
const OPTIONS = { size: puzzle.size.items, autoEliminate: true };

/** One tap on a square: blank → cross → tick → blank, as the board cycles. */
function tap(marks: Marks, step: (typeof STEPS)[number]): Marks {
  return setMark(marks, step.cell, nextMark(getMark(marks, step.cell)), OPTIONS);
}

describe('the tutorial board', () => {
  it('is one grid of nine squares', () => {
    expect(puzzle.categories).toHaveLength(2);
    for (const category of puzzle.categories) expect(category.items).toHaveLength(3);
    expect(puzzle.size.items).toBe(3);
  });

  /**
   * Every clue has to be true of the answer, the same as a generated puzzle's.
   * A tutorial that told the player something false about its own board would
   * teach them to distrust the one thing the game asks them to trust.
   */
  it('says nothing about its board that is not so', () => {
    for (const clue of puzzle.clues) {
      expect(clue.kind).toBe('link');
      if (clue.kind !== 'link') continue;
      const entity = puzzle.solution[clue.a.category].indexOf(clue.a.item);
      const holds = puzzle.solution[clue.b.category][entity] === clue.b.item;
      expect(holds).toBe(clue.positive);
    }
  });

  /** Named, never described: the tutorial strips the traits to make sure. */
  it('names everybody it talks about', () => {
    for (const category of puzzle.categories) expect(category.traits).toEqual([]);
    for (const clue of puzzle.clues) {
      const text = describeClue(clue, puzzle);
      expect(text).toContain(
        puzzle.categories[0].items[clue.kind === 'link' ? clue.a.item : 0].label,
      );
    }
  });
});

describe('the walk', () => {
  /**
   * The words tell the player how many taps a square wants — "one tap crosses
   * it out", "tap it twice" — and that is only true while the square is still
   * empty when its turn comes. An earlier step that filled it in, by hand or
   * automatically, would make the instruction a lie without failing anything
   * else, so this is what holds the two together.
   */
  it('asks for an empty square every time, and takes the taps it says it does', () => {
    let marks: Marks = {};
    STEPS.forEach((step, index) => {
      expect(stepAt(marks)).toBe(index);
      expect(getMark(marks, step.cell)).toBeUndefined();

      const taps = step.want === 'no' ? 1 : 2;
      for (let tapped = 0; tapped < taps; tapped++) marks = tap(marks, step);

      expect(stepDone(marks, step)).toBe(true);
      expect(stepAt(marks)).toBe(index + 1);
    });

    expect(stepAt(marks)).toBe(STEPS.length);
    expect(isSolved(marks, puzzle)).toBe(true);
  });

  /**
   * The lesson the whole screen exists for: the tick on the second step fills
   * in the rest of its row and column without being asked, and those marks are
   * the board's rather than the player's.
   */
  it('fills in a row and a column off the tick it teaches', () => {
    let marks: Marks = {};
    marks = tap(marks, STEPS[0]);
    expect(Object.keys(marks)).toHaveLength(1);

    marks = tap(tap(marks, STEPS[1]), STEPS[1]);
    const automatic = Object.values(marks).filter((entry) => entry.source === 'auto');
    // Two others in the row, two others in the column.
    expect(automatic).toHaveLength(4);
    expect(automatic.every((entry) => entry.mark === 'no')).toBe(true);
  });

  /** A mark taken back takes the lesson back with it. */
  it('steps back when the player does', () => {
    let marks = tap({}, STEPS[0]);
    expect(stepAt(marks)).toBe(1);

    // Round the cycle: cross → tick → blank.
    marks = tap(tap(marks, STEPS[0]), STEPS[0]);
    expect(stepAt(marks)).toBe(0);
  });
});
