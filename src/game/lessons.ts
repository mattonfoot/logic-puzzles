/**
 * The boards the app teaches itself with, and the marks each one walks.
 *
 * Every instruction was taken off the board on purpose, and the board is better
 * for it — but that left the app assuming its player had met a logic grid
 * before. Nothing said that a tick rules out the rest of its row and column,
 * which is the one rule the whole game turns on, and nothing said what a clue
 * that only offers two options is for. A caption would have said all of it to
 * everybody, for ever, in the place a player looks when they are trying to
 * think. These say it once, to somebody who asked, on boards they are marking
 * themselves — and are then never seen again.
 *
 * They are real boards: the same `GridBoard`, the same marks, the same
 * automatic crosses, the same sentences the generator writes. What makes them
 * teachable is that they are the smallest boards there are — three of each, one
 * or three grids — where a full game is six grids of a bigger cast. Small
 * enough that the last square is obvious, and being obvious is the whole
 * feeling the game is trying to sell.
 *
 * Each lesson is one kind of thinking, and every clue on it is of the kind it
 * teaches: the negative lesson has nothing but negatives on it, the comparison
 * lesson nothing but comparisons. A board with one of everything on it teaches
 * that the game has clues, which the player already knew.
 *
 * The cast is fixed rather than generated. The words are written against these
 * squares in this order, and a puzzle that came out differently each time would
 * be a lesson that sometimes did not follow.
 */
import {
  cellFromKey,
  findMistakes,
  isSolved,
  markKey,
  type Cell,
  type Marks,
  getMark,
} from './board';
import { themeById } from '../data/themes';
import { resolveClueTemplates } from '../puzzle/describe';
import type {
  CategoryDef,
  Clue,
  Puzzle,
  PuzzleCategory,
  SizeOption,
  ThemeDef,
} from '../puzzle/types';
import { plural, t } from '../i18n';

/** Three of each, which is the smallest board that can be reasoned about. */
const CAST = 3;

export type LessonId =
  'deduction' | 'further' | 'negative' | 'comparison' | 'grouped' | 'gap' | 'vague';

/** What the player is being asked to do, and what it settled once they have. */
export interface Step {
  /** The instruction, above the board. */
  line: string;
  /** The clue it follows from, when there is one. */
  clue?: number;
  /** The square to mark, and what it should end up holding. */
  cell: Cell;
  want: 'yes' | 'no';
  /** Said once the mark is down, before the next thing is asked for. */
  after: string;
}

export interface Lesson {
  id: LessonId;
  /** Its name, on the menu and over the board. */
  title: string;
  /** Read out on the menu: what it teaches. */
  blurb: string;
  /** The line before anything is marked. */
  opening: string;
  puzzle: Puzzle;
  /** The marks that are talked through. What is left over is not. */
  steps: Step[];
  /** Said while there is board left and no step left to read. */
  finish: string;
  /**
   * Whether tapping a picture opens its card.
   *
   * Off unless the lesson is about something written on one. A card is the
   * answer to "who is this?", and on a board where every clue says a name there
   * is no such question — opening one would only be something else to shut.
   * The grouped lesson is the exception it exists for: its clues describe
   * people rather than naming them, and the card is where the descriptions come
   * from.
   */
  cards: boolean;
}

/**
 * A shape of its own, so a puzzle carries the shape it was built to.
 *
 * Nothing looks these ids up — a lesson is never saved, never recorded and
 * never counted.
 */
const shapeFor = (id: LessonId, sets: number, title: string): SizeOption => ({
  id: `lesson-${id}`,
  items: CAST,
  categories: sets,
  label: `${CAST} × ${sets}`,
  difficulty: title,
});

/**
 * One café set, cut down to the three a lesson uses.
 *
 * `traits` decides whether its items can be described rather than named. Most
 * lessons drop them: a clue can name somebody by a trait they alone have — "the
 * customer with the beard" — and it is a good thing in a real puzzle, but it is
 * a second idea to hold on a screen teaching the first one. With none to draw
 * on, every clue says a name. The grouped lesson keeps them, because describing
 * a group of people is the thing it is about.
 */
function setOf(
  theme: ThemeDef,
  id: string,
  itemIds: string[],
  { traits = false }: { traits?: boolean } = {},
): PuzzleCategory {
  const category: CategoryDef | undefined = theme.categories.find(
    (candidate) => candidate.id === id,
  );
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
    traits: traits ? category.traits : [],
    items,
    // Carried through when the set has it: a comparison clue is unreadable
    // without the words for which way it runs and what it is counting in.
    ...(category.ordered ? { ordered: category.ordered } : null),
  };
}

/** A lesson's board, with the theme's own wording resolved onto it. */
function board(
  theme: ThemeDef,
  id: LessonId,
  categories: PuzzleCategory[],
  solution: number[][],
  clues: Clue[],
  title: string,
): Puzzle {
  return {
    seed: 0,
    clueTemplates: resolveClueTemplates(theme),
    themeId: theme.id,
    themeName: theme.name,
    themeIcon: theme.icon,
    size: shapeFor(id, categories.length, title),
    categories,
    solution,
    clues,
  };
}

/** Shorthand for a square: category `c1` item `i1` against category `c2` item `i2`. */
const at = (c1: number, i1: number, c2: number, i2: number): Cell => ({ c1, i1, c2, i2 });

/** Shorthand for one side of a clue. */
const of = (category: number, item: number) => ({ category, item });

const CUSTOMERS = ['barley', 'crumb', 'marzipan'];
const DRINKS = ['latte', 'mocha', 'chai'];
const PASTRIES = ['croissant', 'cannel', 'scone'];
/** $4, $5 and $6, which is the plain run a comparison walks up. */
const BILLS = ['4', '5', '6'];
/** $4, $5 and $7: one pair a dollar apart, and one bill that is not near either. */
const GAPPED_BILLS = ['4', '5', '7'];

/**
 * Two clues, two pairs, and the third pair left where the player can see it.
 *
 * The first lesson anybody takes, and the smallest true thing the game has to
 * say: a tick is not one square, it is a row and a column settled. Both clues
 * are the plainest kind there is, so nothing on the screen is competing with
 * the rule being taught.
 */
function usingDeduction(): Lesson {
  const title = t('lessons.deduction.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'deduction',
    [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'drink', DRINKS)],
    // Barley has the mocha, Crumb the chai, Marzipan the latte.
    [
      [0, 1, 2],
      [1, 2, 0],
    ],
    [
      { kind: 'link', positive: true, a: of(0, 0), b: of(1, 1) },
      { kind: 'link', positive: true, a: of(0, 1), b: of(1, 2) },
    ],
    title,
  );
  return {
    id: 'deduction',
    title,
    blurb: t('lessons.deduction.blurb'),
    opening: t('lessons.deduction.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.deduction.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.deduction.steps.oneDone'),
      },
      {
        line: t('lessons.deduction.steps.two'),
        clue: 1,
        cell: at(0, 1, 1, 2),
        want: 'yes',
        after: t('lessons.deduction.steps.twoDone'),
      },
    ],
    finish: t('lessons.deduction.finish'),
    cards: false,
  };
}

/**
 * A third set, and the pair that appears on a grid no clue mentions.
 *
 * Every clue here is the same plain link the first lesson used, which is the
 * point: nothing new is being read, and the new thing is entirely in what
 * follows from it. Two ticks about the same customer settle a square on a grid
 * she does not appear on, and that step — the one this board exists for — is
 * walked third, before the board has filled up enough to hide it.
 */
function furtherDeduction(): Lesson {
  const title = t('lessons.further.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'further',
    [
      setOf(theme, 'customer', CUSTOMERS),
      setOf(theme, 'drink', DRINKS),
      setOf(theme, 'pastry', PASTRIES),
    ],
    // Barley: mocha, croissant. Crumb: chai, cannelé. Marzipan: latte, scone.
    [
      [0, 1, 2],
      [1, 2, 0],
      [0, 1, 2],
    ],
    [
      { kind: 'link', positive: true, a: of(0, 0), b: of(1, 1) },
      { kind: 'link', positive: true, a: of(0, 0), b: of(2, 0) },
      { kind: 'link', positive: true, a: of(0, 1), b: of(1, 2) },
      { kind: 'link', positive: true, a: of(0, 1), b: of(2, 1) },
    ],
    title,
  );
  return {
    id: 'further',
    title,
    blurb: t('lessons.further.blurb'),
    opening: t('lessons.further.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.further.steps.drink'),
        clue: 0,
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.further.steps.drinkDone'),
      },
      {
        line: t('lessons.further.steps.pastry'),
        clue: 1,
        cell: at(0, 0, 2, 0),
        want: 'yes',
        after: t('lessons.further.steps.pastryDone'),
      },
      {
        // The whole reason this board has three sets on it.
        line: t('lessons.further.steps.carry'),
        cell: at(1, 1, 2, 0),
        want: 'yes',
        after: t('lessons.further.steps.carryDone'),
      },
      {
        line: t('lessons.further.steps.crumbDrink'),
        clue: 2,
        cell: at(0, 1, 1, 2),
        want: 'yes',
        after: t('lessons.further.steps.crumbDrinkDone'),
      },
      {
        line: t('lessons.further.steps.crumbPastry'),
        clue: 3,
        cell: at(0, 1, 2, 1),
        want: 'yes',
        after: t('lessons.further.steps.crumbPastryDone'),
      },
      {
        line: t('lessons.further.steps.crumbCarry'),
        cell: at(1, 2, 2, 1),
        want: 'yes',
        after: t('lessons.further.steps.crumbCarryDone'),
      },
      {
        line: t('lessons.further.steps.lastDrink'),
        cell: at(0, 2, 1, 0),
        want: 'yes',
        after: t('lessons.further.steps.lastDrinkDone'),
      },
      {
        line: t('lessons.further.steps.lastPastry'),
        cell: at(0, 2, 2, 2),
        want: 'yes',
        after: t('lessons.further.steps.lastPastryDone'),
      },
    ],
    finish: t('lessons.further.finish'),
    cards: false,
  };
}

/**
 * Nothing but crosses, and the yes that two of them add up to.
 *
 * A first-timer reads "is not paired with" as a clue that did not tell them
 * anything. Three drinks and two of them ruled out is the shortest possible
 * demonstration that it did.
 */
function negativeClues(): Lesson {
  const title = t('lessons.negative.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'negative',
    [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'drink', DRINKS)],
    [
      [0, 1, 2],
      [1, 2, 0],
    ],
    [
      { kind: 'link', positive: false, a: of(0, 0), b: of(1, 0) },
      { kind: 'link', positive: false, a: of(0, 0), b: of(1, 2) },
      { kind: 'link', positive: false, a: of(0, 1), b: of(1, 0) },
    ],
    title,
  );
  return {
    id: 'negative',
    title,
    blurb: t('lessons.negative.blurb'),
    opening: t('lessons.negative.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.negative.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 0),
        want: 'no',
        after: t('lessons.negative.steps.oneDone'),
      },
      {
        line: t('lessons.negative.steps.two'),
        clue: 1,
        cell: at(0, 0, 1, 2),
        want: 'no',
        after: t('lessons.negative.steps.twoDone'),
      },
      {
        line: t('lessons.negative.steps.three'),
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.negative.steps.threeDone'),
      },
      {
        line: t('lessons.negative.steps.four'),
        clue: 2,
        cell: at(0, 1, 1, 0),
        want: 'no',
        after: t('lessons.negative.steps.fourDone'),
      },
      {
        line: t('lessons.negative.steps.five'),
        cell: at(0, 1, 1, 2),
        want: 'yes',
        after: t('lessons.negative.steps.fiveDone'),
      },
    ],
    finish: t('lessons.negative.finish'),
    cards: false,
  };
}

/**
 * Higher and lower, on a set of bills.
 *
 * A comparison names no number at all, which is what makes it hard to read the
 * first time. What it settles is the ends: whoever is above somebody is not the
 * lowest, and whoever is below somebody is not the highest. Two clues, six
 * crossings-out, and the board falls out.
 */
function comparisonClues(): Lesson {
  const title = t('lessons.comparison.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'comparison',
    [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'bill', BILLS)],
    // Barley $5, Crumb $4, Marzipan $6.
    [
      [0, 1, 2],
      [1, 0, 2],
    ],
    [
      { kind: 'compare', order: 1, greater: of(0, 0), lesser: of(0, 1) },
      { kind: 'compare', order: 1, greater: of(0, 2), lesser: of(0, 0) },
    ],
    title,
  );
  return {
    id: 'comparison',
    title,
    blurb: t('lessons.comparison.blurb'),
    opening: t('lessons.comparison.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.comparison.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 0),
        want: 'no',
        after: t('lessons.comparison.steps.oneDone'),
      },
      {
        line: t('lessons.comparison.steps.two'),
        clue: 0,
        cell: at(0, 1, 1, 2),
        want: 'no',
        after: t('lessons.comparison.steps.twoDone'),
      },
      {
        line: t('lessons.comparison.steps.three'),
        clue: 1,
        cell: at(0, 2, 1, 0),
        want: 'no',
        after: t('lessons.comparison.steps.threeDone'),
      },
      {
        line: t('lessons.comparison.steps.four'),
        cell: at(0, 1, 1, 0),
        want: 'yes',
        after: t('lessons.comparison.steps.fourDone'),
      },
      {
        line: t('lessons.comparison.steps.five'),
        clue: 1,
        cell: at(0, 0, 1, 2),
        want: 'no',
        after: t('lessons.comparison.steps.fiveDone'),
      },
      {
        line: t('lessons.comparison.steps.six'),
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.comparison.steps.sixDone'),
      },
    ],
    finish: t('lessons.comparison.finish'),
    cards: false,
  };
}

/**
 * A clue about everybody a description fits.
 *
 * The only lesson whose cast keeps its traits, and the only one that needs
 * them: two of these three customers wear spectacles and two of them have green
 * eyes, which is what lets one sentence cross off two squares. It is also the
 * only one where the item card is worth opening, since the descriptions the
 * clues use are written on it and nowhere else.
 */
function groupedClues(): Lesson {
  const title = t('lessons.grouped.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'grouped',
    [
      // Barley and Frangipane wear spectacles; Barley and Custard have green
      // eyes. Two overlapping pairs out of three people, which is what the two
      // clues need.
      setOf(theme, 'customer', ['barley', 'frangi', 'custard'], { traits: true }),
      setOf(theme, 'drink', DRINKS),
    ],
    // Barley the chai, Frangipane the mocha, Custard the latte.
    [
      [0, 1, 2],
      [2, 1, 0],
    ],
    [
      {
        kind: 'groupNot',
        group: { category: 0, trait: 'feature', value: 'spectacles', items: [0, 1] },
        b: of(1, 0),
      },
      {
        kind: 'groupNot',
        group: { category: 0, trait: 'eyes', value: 'green', items: [0, 2] },
        b: of(1, 1),
      },
    ],
    title,
  );
  return {
    id: 'grouped',
    title,
    blurb: t('lessons.grouped.blurb'),
    opening: t('lessons.grouped.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.grouped.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 0),
        want: 'no',
        after: t('lessons.grouped.steps.oneDone'),
      },
      {
        line: t('lessons.grouped.steps.two'),
        clue: 0,
        cell: at(0, 1, 1, 0),
        want: 'no',
        after: t('lessons.grouped.steps.twoDone'),
      },
      {
        line: t('lessons.grouped.steps.three'),
        cell: at(0, 2, 1, 0),
        want: 'yes',
        after: t('lessons.grouped.steps.threeDone'),
      },
      {
        line: t('lessons.grouped.steps.four'),
        clue: 1,
        cell: at(0, 0, 1, 1),
        want: 'no',
        after: t('lessons.grouped.steps.fourDone'),
      },
      {
        line: t('lessons.grouped.steps.five'),
        cell: at(0, 0, 1, 2),
        want: 'yes',
        after: t('lessons.grouped.steps.fiveDone'),
      },
    ],
    finish: t('lessons.grouped.finish'),
    cards: true,
  };
}

/**
 * A comparison that says exactly how far apart.
 *
 * One clue settles this whole board, which is the honest lesson: an exact gap
 * is the strongest sentence the game writes. Reading it means reading the
 * numbers on the set first and asking which two of them are that far apart —
 * $4, $5 and $7 leave exactly one pair a dollar apart, and the odd bill out is
 * ruled out of both ends of the clue.
 */
function gapClues(): Lesson {
  const title = t('lessons.gap.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'gap',
    [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'bill', GAPPED_BILLS)],
    // Barley $5, Crumb $4, Marzipan $7.
    [
      [0, 1, 2],
      [1, 0, 2],
    ],
    [{ kind: 'compare', order: 1, greater: of(0, 0), lesser: of(0, 1), gap: 1 }],
    title,
  );
  return {
    id: 'gap',
    title,
    blurb: t('lessons.gap.blurb'),
    opening: t('lessons.gap.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.gap.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 0),
        want: 'no',
        after: t('lessons.gap.steps.oneDone'),
      },
      {
        line: t('lessons.gap.steps.two'),
        clue: 0,
        cell: at(0, 0, 1, 2),
        want: 'no',
        after: t('lessons.gap.steps.twoDone'),
      },
      {
        line: t('lessons.gap.steps.three'),
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.gap.steps.threeDone'),
      },
      {
        line: t('lessons.gap.steps.four'),
        clue: 0,
        cell: at(0, 1, 1, 2),
        want: 'no',
        after: t('lessons.gap.steps.fourDone'),
      },
      {
        line: t('lessons.gap.steps.five'),
        cell: at(0, 1, 1, 0),
        want: 'yes',
        after: t('lessons.gap.steps.fiveDone'),
      },
    ],
    finish: t('lessons.gap.finish'),
    cards: false,
  };
}

/**
 * Two options offered, and the one that was not.
 *
 * The clue that looks like it says nothing. It says exactly one thing — that
 * the option it left out is out — and two of them about the same person say
 * something stronger than either did, which is the second half of the lesson.
 */
function vagueClues(): Lesson {
  const title = t('lessons.vague.title');
  const theme = themeById('cafe');
  const puzzle = board(
    theme,
    'vague',
    [setOf(theme, 'customer', CUSTOMERS), setOf(theme, 'drink', DRINKS)],
    // Barley the mocha, Crumb the latte, Marzipan the chai.
    [
      [0, 1, 2],
      [1, 0, 2],
    ],
    [
      { kind: 'either', a: of(0, 0), options: [of(1, 0), of(1, 1)] },
      { kind: 'either', a: of(0, 0), options: [of(1, 1), of(1, 2)] },
      { kind: 'either', a: of(0, 1), options: [of(1, 0), of(1, 1)] },
    ],
    title,
  );
  return {
    id: 'vague',
    title,
    blurb: t('lessons.vague.blurb'),
    opening: t('lessons.vague.opening'),
    puzzle,
    steps: [
      {
        line: t('lessons.vague.steps.one'),
        clue: 0,
        cell: at(0, 0, 1, 2),
        want: 'no',
        after: t('lessons.vague.steps.oneDone'),
      },
      {
        line: t('lessons.vague.steps.two'),
        clue: 1,
        cell: at(0, 0, 1, 0),
        want: 'no',
        after: t('lessons.vague.steps.twoDone'),
      },
      {
        line: t('lessons.vague.steps.three'),
        cell: at(0, 0, 1, 1),
        want: 'yes',
        after: t('lessons.vague.steps.threeDone'),
      },
      {
        line: t('lessons.vague.steps.four'),
        clue: 2,
        cell: at(0, 1, 1, 2),
        want: 'no',
        after: t('lessons.vague.steps.fourDone'),
      },
      {
        line: t('lessons.vague.steps.five'),
        cell: at(0, 1, 1, 0),
        want: 'yes',
        after: t('lessons.vague.steps.fiveDone'),
      },
    ],
    finish: t('lessons.vague.finish'),
    cards: false,
  };
}

const BUILDERS: Record<LessonId, () => Lesson> = {
  deduction: usingDeduction,
  further: furtherDeduction,
  negative: negativeClues,
  comparison: comparisonClues,
  grouped: groupedClues,
  gap: gapClues,
  vague: vagueClues,
};

/**
 * What "How to play" opens: learn the game, then learn to read what it says.
 *
 * The third entry is a door rather than a board, and it is last because there
 * is no point knowing what a comparison clue rules out before knowing what
 * ruling something out is for.
 */
export const FIRST_LESSONS: LessonId[] = ['deduction', 'further'];

/** What "Understanding clues" opens: one board per kind of clue the game writes. */
export const CLUE_LESSONS: LessonId[] = ['negative', 'comparison', 'grouped', 'gap', 'vague'];

/** Built on demand: seven boards nobody has asked for is seven boards too many. */
export function lessonById(id: LessonId): Lesson {
  return BUILDERS[id]();
}

/** Its name and what it teaches, for the menu, without building its board. */
export function lessonCard(id: LessonId): { id: LessonId; title: string; blurb: string } {
  const lesson = lessonById(id);
  return { id, title: lesson.title, blurb: lesson.blurb };
}

/** Which menu a lesson was opened from, so the way back goes where it came from. */
export const menuOf = (id: LessonId): 'lessons' | 'clueLessons' =>
  CLUE_LESSONS.includes(id) ? 'clueLessons' : 'lessons';

/** Whether the mark a step is waiting for is on the board. */
export function stepDone(marks: Marks, step: Step): boolean {
  return getMark(marks, step.cell) === step.want;
}

/** The squares a step is about, for the highlight that points at it. */
export function stepHighlight(step: Step) {
  return [
    { category: step.cell.c1, item: step.cell.i1 },
    { category: step.cell.c2, item: step.cell.i2 },
  ];
}

/** Used by the test that holds every walk to being walkable. */
export const stepKey = (step: Step) => markKey(step.cell);

/** A square, said the way the board labels it: "Ms Barley and the Mocha". */
export function squareName(puzzle: Puzzle, cell: Cell): string {
  return t('lessons.check.square', {
    row: puzzle.categories[cell.c1].items[cell.i1].label,
    column: puzzle.categories[cell.c2].items[cell.i2].label,
  });
}

/** A short list of them, as a sentence would say it. */
function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return t('lessons.check.listLast', {
    first: names.slice(0, -1).join(', '),
    last: names[names.length - 1],
  });
}

/**
 * What the Clue button found when it was pressed a second time.
 *
 * A real board keeps its opinion of the player's marks to itself until a clue
 * cannot help, because being told mid-thought that you are wrong is the game
 * solving the puzzle for you. A lesson is *asked* — the second press of Clue is
 * the player saying "I am done" — so it answers, and answers usefully: what is
 * wrong, and the taps that put it right.
 */
export interface Check {
  ok: boolean;
  /** What is wrong and how to fix it, when it is not. */
  problem?: string;
  /** The squares to shade while that stands, by their mark keys. */
  flagged?: string[];
}

/** Marks that contradict the answer, wherever on the board they are. */
function wrongMarks(marks: Marks, puzzle: Puzzle): Check | null {
  const flagged = findMistakes(marks, puzzle);
  if (flagged.length === 0) return null;
  const named = flagged
    .map((key) => cellFromKey(key))
    .filter((cell): cell is Cell => cell !== null)
    .map((cell) => squareName(puzzle, cell));
  return {
    ok: false,
    problem: plural('lessons.check.wrong', flagged.length, { squares: listOf(named) }),
    flagged,
  };
}

/**
 * Whether the board is what the step asked for.
 *
 * The square the player was just told about comes first. A mark on it that is
 * the wrong way round is the most useful thing there is to say — "tap it once
 * more" and "tap it twice" are different instructions and only one of them is
 * ever right — and burying that under a general complaint about the board would
 * be answering a question next to the one that was asked.
 *
 * After that it is the rest of the board. A mark that cannot be right anywhere
 * on it stops the walk even when the asked-for square is perfect: a lesson that
 * moved the player on past a contradiction would be teaching them the board
 * does not mind.
 */
export function checkStep(marks: Marks, puzzle: Puzzle, step: Step): Check {
  if (stepDone(marks, step)) return wrongMarks(marks, puzzle) ?? { ok: true };

  const square = squareName(puzzle, step.cell);
  const mark = getMark(marks, step.cell);
  if (mark !== undefined) {
    return {
      ok: false,
      problem: t(step.want === 'yes' ? 'lessons.check.crossed' : 'lessons.check.ticked', {
        square,
      }),
      flagged: [markKey(step.cell)],
    };
  }
  return wrongMarks(marks, puzzle) ?? { ok: false, problem: t('lessons.check.blank', { square }) };
}

/** And whether the square nobody talked them through is filled in. */
export function checkFinished(marks: Marks, puzzle: Puzzle): Check {
  const wrong = wrongMarks(marks, puzzle);
  if (wrong) return wrong;
  if (isSolved(marks, puzzle)) return { ok: true };
  return { ok: false, problem: t('lessons.check.unfinished') };
}
