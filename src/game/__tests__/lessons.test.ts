import { categoryPairs, getMark, isSolved, markKey, nextMark, setMark, type Marks } from '../board';
import {
  CLUE_LESSONS,
  FIRST_LESSONS,
  checkFinished,
  checkStep,
  lessonById,
  menuOf,
  squareName,
  stepDone,
  type Lesson,
  type LessonId,
  type Step,
} from '../lessons';
import { describeClue, itemsWithTrait } from '../../puzzle/describe';
import { contextFor, hasUniqueSolution, satisfiesAll, solveByDeduction } from '../../puzzle/solver';
import type { Clue } from '../../puzzle/types';

const EVERY: LessonId[] = [...FIRST_LESSONS, ...CLUE_LESSONS];

/**
 * What each lesson is allowed to have on it.
 *
 * A lesson is one kind of thinking, and the board it is taught on has nothing
 * else on it: a board with one of everything teaches that the game has clues,
 * which the player already knew. This is what holds each board to its subject —
 * a clue slipped onto the wrong one would still be true, still be solvable, and
 * still be the wrong lesson.
 */
const ALLOWED: Record<LessonId, (clue: Clue) => boolean> = {
  deduction: (clue) => clue.kind === 'link' && clue.positive,
  further: (clue) => clue.kind === 'link' && clue.positive,
  negative: (clue) => clue.kind === 'link' && !clue.positive,
  comparison: (clue) => clue.kind === 'compare' && clue.gap === undefined,
  grouped: (clue) => clue.kind === 'groupNot',
  gap: (clue) => clue.kind === 'compare' && clue.gap !== undefined,
  vague: (clue) => clue.kind === 'either',
};

/** How many sets each board plays with. */
const SETS: Record<LessonId, number> = {
  deduction: 2,
  further: 3,
  negative: 2,
  comparison: 2,
  grouped: 2,
  gap: 2,
  vague: 2,
};

const contextOf = (lesson: Lesson) =>
  contextFor(lesson.puzzle.categories, lesson.puzzle.size.items);

/** One tap on a square: blank → cross → tick → blank, as the board cycles. */
function tap(marks: Marks, step: Step, size: number): Marks {
  return setMark(marks, step.cell, nextMark(getMark(marks, step.cell)), {
    size,
    autoEliminate: true,
  });
}

/** Every square the answer says is a pair, whatever grid it is on. */
function correctCells(lesson: Lesson) {
  const { solution, size, categories } = lesson.puzzle;
  const cells = [];
  for (const [c1, c2] of categoryPairs(categories.length)) {
    for (let entity = 0; entity < size.items; entity++) {
      cells.push({ c1, i1: solution[c1][entity], c2, i2: solution[c2][entity] });
    }
  }
  return cells;
}

/** Walks a lesson's steps the way the words say to, and hands back the board. */
function walk(lesson: Lesson): Marks {
  let marks: Marks = {};
  lesson.steps.forEach((step, index) => {
    // The words tell the player how many taps a square wants — "one tap crosses
    // it out", "tap it twice" — and that is only true while the square is still
    // empty when its turn comes. An earlier step that filled it in, by hand or
    // automatically, would make the instruction a lie without failing anything
    // else.
    expect(getMark(marks, step.cell)).toBeUndefined();

    const taps = step.want === 'no' ? 1 : 2;
    for (let tapped = 0; tapped < taps; tapped++)
      marks = tap(marks, step, lesson.puzzle.size.items);

    // The step is done, and so is everything the walk has already been
    // through: a later step must never undo an earlier one.
    for (const earlier of lesson.steps.slice(0, index + 1)) {
      expect(stepDone(marks, earlier)).toBe(true);
    }
    // And the board is what the Clue button would pass.
    expect(checkStep(marks, lesson.puzzle, step).ok).toBe(true);
  });
  return marks;
}

describe('the lessons', () => {
  it('are the two menus and nothing else', () => {
    expect(FIRST_LESSONS).toEqual(['deduction', 'further']);
    expect(CLUE_LESSONS).toEqual(['negative', 'comparison', 'grouped', 'gap', 'vague']);
    // Nothing is on both menus, and nothing is on neither.
    expect(new Set(EVERY).size).toBe(EVERY.length);
  });

  it('send a player back to the menu they came from', () => {
    for (const id of FIRST_LESSONS) expect(menuOf(id)).toBe('lessons');
    for (const id of CLUE_LESSONS) expect(menuOf(id)).toBe('clueLessons');
  });

  it('build a fresh board every time, so nothing carries over', () => {
    const once = lessonById('deduction');
    const again = lessonById('deduction');
    expect(once.puzzle).not.toBe(again.puzzle);
    expect(once.puzzle.solution).toEqual(again.puzzle.solution);
  });
});

describe.each(EVERY)('the %s lesson', (id) => {
  const lesson = lessonById(id);
  const puzzle = lesson.puzzle;
  const ctx = contextOf(lesson);

  it('is three of each, on the sets it says it is', () => {
    expect(puzzle.categories).toHaveLength(SETS[id]);
    expect(puzzle.size.items).toBe(3);
    expect(puzzle.size.categories).toBe(SETS[id]);
    expect(puzzle.size.label).toBe(`3 × ${SETS[id]}`);
    for (const category of puzzle.categories) expect(category.items).toHaveLength(3);
  });

  it('has an answer that is a real answer', () => {
    expect(puzzle.solution).toHaveLength(SETS[id]);
    // Entity e always owns item e of the anchor set, and every other set is a
    // permutation of the same three items.
    expect(puzzle.solution[0]).toEqual([0, 1, 2]);
    for (const row of puzzle.solution) {
      expect([...row].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    }
  });

  /**
   * Every clue has to be true of the answer, the same as a generated puzzle's.
   * A lesson that told the player something false about its own board would
   * teach them to distrust the one thing the game asks them to trust.
   */
  it('says nothing about its board that is not so', () => {
    expect(satisfiesAll(puzzle.clues, puzzle.solution, ctx)).toBe(true);
  });

  /**
   * And it has to be a real puzzle, not a demonstration: the clues on it settle
   * the board on their own, with no branching anywhere — which is exactly what
   * the generator holds every shipped puzzle to.
   */
  it('is settled by its own clues, without guessing', () => {
    expect(hasUniqueSolution(puzzle.clues, ctx)).toBe(true);
    expect(solveByDeduction(puzzle.clues, ctx)).toEqual(puzzle.solution);
  });

  it('has nothing on it but the kind of clue it teaches', () => {
    expect(puzzle.clues.length).toBeGreaterThan(0);
    for (const clue of puzzle.clues) expect(ALLOWED[id](clue)).toBe(true);
  });

  /**
   * Named, never described. The grouped lesson is the one exception, and even
   * there only the set its clues describe keeps its traits: the other side of
   * every sentence is still a name, so there is one new idea on the board
   * rather than two.
   */
  it('names what it talks about, unless describing is the lesson', () => {
    const described = id === 'grouped';
    const withTraits = puzzle.categories.filter((category) => category.traits.length > 0);
    expect(withTraits).toHaveLength(described ? 1 : 0);
    expect(lesson.cards).toBe(described);
  });

  it('reads as a sentence, every clue of it', () => {
    for (const clue of puzzle.clues) {
      const text = describeClue(clue, puzzle);
      expect(text.length).toBeGreaterThan(10);
      expect(text).toMatch(/^[A-Z].*\.$/);
      // A slot the wording could not fill would leave its braces behind.
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it('walks every step onto an empty square, in the taps the words promise', () => {
    walk(lesson);
  });

  /**
   * The point of every one of them: the walk stops with the board unfinished.
   * By then there is no clue left to read and nothing left to be told, so the
   * only thing that can fill the last square is the player working it out.
   */
  it('stops talking one pair short of the answer', () => {
    const marks = walk(lesson);
    expect(isSolved(marks, puzzle)).toBe(false);

    const left = correctCells(lesson).filter((cell) => getMark(marks, cell) !== 'yes');
    expect(left).toHaveLength(1);

    let finished = marks;
    for (let tapped = 0; tapped < 2; tapped++) {
      finished = setMark(finished, left[0], nextMark(getMark(finished, left[0])), {
        size: puzzle.size.items,
        autoEliminate: true,
      });
    }
    expect(isSolved(finished, puzzle)).toBe(true);
  });

  /**
   * What the Clue button finds when the square is empty, or marked the wrong
   * way round. Both answers name the square and say which taps put it right;
   * "tap it once more" and "tap it twice" are different instructions, and only
   * one of them is ever correct.
   */
  it('says what is missing, and which way round it is wrong', () => {
    const first = lesson.steps[0];
    const size = puzzle.size.items;

    const empty = checkStep({}, puzzle, first);
    expect(empty.ok).toBe(false);
    expect(empty.problem).toContain(squareName(puzzle, first.cell));
    expect(empty.problem).toMatch(/Nothing on/);

    // One tap short of, or one past, what was asked for.
    let marks = tap({}, first, size);
    if (first.want === 'no') marks = tap(marks, first, size);
    const halfway = checkStep(marks, puzzle, first);
    expect(halfway.ok).toBe(false);
    expect(halfway.problem).toContain(squareName(puzzle, first.cell));
    expect(halfway.problem).toMatch(first.want === 'yes' ? /crossed out/ : /is ticked/);

    // And once it is right, it passes.
    while (getMark(marks, first.cell) !== first.want) marks = tap(marks, first, size);
    expect(checkStep(marks, puzzle, first)).toEqual({ ok: true });
  });

  /**
   * A mark that cannot be right is said first, whatever square the step was
   * about: a lesson that walked the player past a contradiction to talk about
   * something else would be teaching them the board does not mind.
   */
  it('names a mark that cannot be right, wherever on the board it is', () => {
    const size = puzzle.size.items;
    // A cross somewhere the answer says is a pair, and never the square the
    // first step is about — that one has its own answer.
    const [wrongCell] = correctCells(lesson).filter(
      (cell) => markKey(cell) !== markKey(lesson.steps[0].cell),
    );
    const marks = tap({}, { ...lesson.steps[0], cell: wrongCell, want: 'no' }, size);

    const found = checkStep(marks, puzzle, lesson.steps[0]);
    expect(found.ok).toBe(false);
    expect(found.problem).toContain(squareName(puzzle, wrongCell));
    expect(found.flagged).toContain(markKey(wrongCell));
  });

  /**
   * And it stops the walk even when the square being asked about is perfect: a
   * lesson that moved on past a contradiction would be teaching the player that
   * the board does not mind.
   */
  it('will not move on over a contradiction somewhere else', () => {
    const size = puzzle.size.items;
    const first = lesson.steps[0];
    let marks: Marks = {};
    while (getMark(marks, first.cell) !== first.want) marks = tap(marks, first, size);
    expect(checkStep(marks, puzzle, first).ok).toBe(true);

    const [wrongCell] = correctCells(lesson).filter(
      (cell) => getMark(marks, cell) === undefined && markKey(cell) !== markKey(first.cell),
    );
    marks = tap(marks, { ...first, cell: wrongCell, want: 'no' }, size);
    expect(checkStep(marks, puzzle, first).ok).toBe(false);
  });

  /** And the last square, which nobody talked them through. */
  it('holds out for the square it never explained', () => {
    const walked = walk(lesson);
    const unfinished = checkFinished(walked, puzzle);
    expect(unfinished.ok).toBe(false);
    expect(unfinished.problem).toMatch(/Not out yet/);

    const [left] = correctCells(lesson).filter((cell) => getMark(walked, cell) !== 'yes');
    let finished = walked;
    while (getMark(finished, left) !== 'yes') {
      finished = tap(finished, { ...lesson.steps[0], cell: left, want: 'yes' }, puzzle.size.items);
    }
    expect(checkFinished(finished, puzzle)).toEqual({ ok: true });
  });

  it('has words for every step and for what is left over', () => {
    expect(lesson.title).not.toContain('.');
    for (const text of [lesson.blurb, lesson.opening, lesson.finish]) {
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/[{}]/);
    }
    for (const step of lesson.steps) {
      // Length is not the point — "Settled." is a whole thought — but a step
      // with nothing written on it would draw a blank line over the board.
      expect(step.line.trim()).not.toBe('');
      expect(step.after.trim()).not.toBe('');
      for (const text of [step.line, step.after]) expect(text).not.toMatch(/[{}]/);
      if (step.clue !== undefined) expect(puzzle.clues[step.clue]).toBeDefined();
    }
  });
});

describe('using deduction', () => {
  const lesson = lessonById('deduction');

  /**
   * The lesson the first board exists for: a tick fills in the rest of its row
   * and column without being asked, and those marks are the board's rather than
   * the player's.
   */
  it('fills in a row and a column off the first tick it teaches', () => {
    const size = lesson.puzzle.size.items;
    const marks = tap(tap({}, lesson.steps[0], size), lesson.steps[0], size);
    const automatic = Object.values(marks).filter((entry) => entry.source === 'auto');
    // Two others in the row, two others in the column.
    expect(automatic).toHaveLength(4);
    expect(automatic.every((entry) => entry.mark === 'no')).toBe(true);
  });
});

describe('further deduction', () => {
  const lesson = lessonById('further');

  /**
   * What the third set is for. The third step is on the grid with no customers
   * on it, and no clue mentions that grid at all: it follows from two ticks
   * about the same customer, which is the only new idea on the board.
   */
  it('carries a pair onto a grid no clue talks about', () => {
    const carried = lesson.steps[2];
    expect(carried.clue).toBeUndefined();
    expect(carried.cell.c1).not.toBe(0);
    expect(carried.cell.c2).not.toBe(0);
    for (const clue of lesson.puzzle.clues) {
      if (clue.kind !== 'link') continue;
      expect([clue.a.category, clue.b.category]).toContain(0);
    }
  });
});

describe('grouped clues', () => {
  const lesson = lessonById('grouped');

  /**
   * A group clue is only worth reading if it is about more than one person, and
   * only fair if the people it names really are the ones the description fits.
   */
  it('describes a real group, every time', () => {
    for (const clue of lesson.puzzle.clues) {
      if (clue.kind !== 'groupNot') continue;
      const category = lesson.puzzle.categories[clue.group.category];
      expect(clue.group.items.length).toBeGreaterThan(1);
      expect(itemsWithTrait(category, clue.group.trait, clue.group.value)).toEqual(
        clue.group.items,
      );
      expect(category.traits.some((trait) => trait.id === clue.group.trait)).toBe(true);
    }
  });

  /** And the words on the card are where the player is meant to find them. */
  it('opens its cards, so the descriptions can be looked up', () => {
    expect(lesson.cards).toBe(true);
    const customers = lesson.puzzle.categories[0];
    for (const item of customers.items) {
      expect(Object.keys(item.traits).length).toBeGreaterThan(0);
    }
  });
});
