/**
 * The puzzle the app teaches itself with, and the four marks it walks.
 *
 * Every instruction was taken off the board on purpose, and the board is better
 * for it — but that left the app assuming its player had met a logic grid
 * before. Nothing said that a tick rules out the rest of its row and column,
 * which is the one rule the whole game turns on. A caption would have said it
 * to everybody, for ever, in the place a player looks when they are trying to
 * think. This says it once, to somebody who asked, on a board they are marking
 * themselves — and is then never seen again.
 *
 * It is a real board: the same `GridBoard`, the same marks, the same automatic
 * crosses. What makes it teachable is that it is the smallest board there is —
 * three people, three drinks, one grid of nine squares — where a full game is
 * six grids of a bigger cast. Small enough that the last square is obvious, and
 * being obvious is the whole feeling the game is trying to sell.
 */
import { markKey, type Cell, type Marks, getMark } from './board';
import { themeById } from '../data/themes';
import { resolveClueTemplates } from '../puzzle/describe';
import type { CategoryDef, Clue, Puzzle, PuzzleCategory, SizeOption } from '../puzzle/types';
import { t } from '../i18n';

/** Three of each, which is one grid of nine squares. */
const CAST = 3;

/** The two sets, by the ids they have in the café. */
const CUSTOMERS = ['barley', 'crumb', 'marzipan'];
const DRINKS = ['latte', 'mocha', 'chai'];

/**
 * A shape of its own: two sets rather than the three a Beginner puzzle has, so
 * the staircase is a single square block. Nothing looks this id up — the
 * tutorial is never saved and never recorded — it is here because a puzzle
 * carries the shape it was built to.
 */
const SHAPE: SizeOption = {
  id: 'tutorial',
  items: CAST,
  categories: 2,
  label: `${CAST} × 2`,
  difficulty: t('tutorial.title'),
};

/**
 * One café set, cut down to the three the tutorial uses.
 *
 * The traits go. A clue can name somebody by a trait they alone have — "the
 * customer with the beard" — and it is a good thing in a real puzzle, but it is
 * a second idea to hold on a screen teaching the first one. With none to draw
 * on, every clue here says a name.
 */
function setOf(
  theme: { categories: CategoryDef[] },
  id: string,
  itemIds: string[],
): PuzzleCategory {
  const category = theme.categories.find((candidate) => candidate.id === id);
  if (!category) throw new Error(`The café has no ${id}`);
  const items = itemIds.map((itemId) => {
    const item = category.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error(`The café has no ${id} called ${itemId}`);
    return item;
  });
  return {
    id: category.id,
    name: category.name,
    pattern: category.pattern,
    describes: category.describes,
    noun: category.noun,
    traits: [],
    items,
  };
}

/**
 * Ms Barley drinks the mocha, Alderman Crumb the chai, Mrs Marzipan the latte.
 *
 * Fixed rather than generated: the lesson is written against these three
 * squares in this order, and a puzzle that came out differently each time would
 * be a lesson that sometimes did not follow.
 */
export function tutorialPuzzle(): Puzzle {
  const theme = themeById('cafe');
  return {
    seed: 0,
    clueTemplates: resolveClueTemplates(theme),
    themeId: theme.id,
    themeName: theme.name,
    themeIcon: theme.icon,
    size: SHAPE,
    categories: [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'drink', DRINKS)],
    // solution[category][entity]: entity 0 is Barley, and she has drink 1.
    solution: [
      [0, 1, 2],
      [1, 2, 0],
    ],
    clues: [
      { kind: 'link', positive: false, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
      { kind: 'link', positive: true, a: { category: 0, item: 1 }, b: { category: 1, item: 2 } },
    ],
  };
}

export interface Step {
  /** What the player is being asked to do, above the board. */
  line: string;
  /** The clue it follows from, when there is one. */
  clue?: number;
  /** The square to mark, and what it should end up holding. */
  cell: Cell;
  want: 'yes' | 'no';
  /** Said once the mark is down, before the next thing is asked for. */
  after: string;
}

/**
 * The four marks, in order.
 *
 * Three are explained and the fourth is not, which is the point of it: by then
 * the board is one square from finished and there is no clue left to read, so
 * the only thing that can fill it in is the player working it out. A tutorial
 * that talked all the way to the end would never let that happen.
 */
export const STEPS: Step[] = [
  {
    line: t('tutorial.steps.cross'),
    clue: 0,
    cell: { c1: 0, i1: 0, c2: 1, i2: 0 },
    want: 'no',
    after: t('tutorial.steps.crossDone'),
  },
  {
    line: t('tutorial.steps.tick'),
    clue: 1,
    cell: { c1: 0, i1: 1, c2: 1, i2: 2 },
    want: 'yes',
    after: t('tutorial.steps.tickDone'),
  },
  {
    line: t('tutorial.steps.deduce'),
    cell: { c1: 0, i1: 0, c2: 1, i2: 1 },
    want: 'yes',
    after: t('tutorial.steps.deduceDone'),
  },
  {
    line: t('tutorial.steps.alone'),
    cell: { c1: 0, i1: 2, c2: 1, i2: 0 },
    want: 'yes',
    after: t('tutorial.steps.aloneDone'),
  },
];

/** Whether the mark a step is waiting for is on the board. */
export function stepDone(marks: Marks, step: Step): boolean {
  return getMark(marks, step.cell) === step.want;
}

/**
 * How far through the walk a board is: the first step still waiting, or the
 * length of the list once there are none.
 *
 * Read off the board rather than counted up as the player goes, so a mark taken
 * back steps the lesson back with it. The steps only ever add to the board, so
 * the first one still outstanding is the one to ask for.
 */
export function stepAt(marks: Marks): number {
  const at = STEPS.findIndex((step) => !stepDone(marks, step));
  return at === -1 ? STEPS.length : at;
}

/** The squares a step is about, for the highlight that points at it. */
export function stepHighlight(step: Step) {
  return [
    { category: step.cell.c1, item: step.cell.i1 },
    { category: step.cell.c2, item: step.cell.i2 },
  ];
}

/** Used by the test that holds the walk to being walkable. */
export const stepKey = (step: Step) => markKey(step.cell);
