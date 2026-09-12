/**
 * How much of a clue is left to give.
 *
 * A clue on the table is worth reading until the board says everything it says.
 * `clueMarks` works out which squares a single clue forces *given the board as
 * it stands* — the way a player re-reads a clue after learning something new —
 * and a clue whose marks are all down has nothing left to offer, so the game
 * crosses it off.
 *
 * Only what the clue itself says is counted. The crosses that follow from a
 * tick, or the tick that follows from the last blank in a row, are the grid's
 * rules rather than the clue's, and the board fills those in on its own.
 */
import { buildPools, clueKey } from '../puzzle/generator';
import { createRng } from '../puzzle/rng';
import { contextFor } from '../puzzle/solver';
import type { Attribute, Clue, Puzzle } from '../puzzle/types';
import { getMark, markKey, type Cell, type Mark, type Marks } from './board';

export interface RequiredMark {
  cell: Cell;
  mark: Mark;
}

const between = (a: Attribute, b: Attribute): Cell => ({
  c1: a.category,
  i1: a.item,
  c2: b.category,
  i2: b.item,
});

const at = (category: number, item: number): Attribute => ({ category, item });

/** An ordered category's values, falling back to the item order. */
function valuesOf(puzzle: Puzzle, category: number): number[] {
  return puzzle.categories[category].items.map((item, index) => item.value ?? index);
}

/** Which items of `category` the entity holding `attr` could still own. */
function candidates(marks: Marks, puzzle: Puzzle, attr: Attribute, category: number): number[] {
  if (attr.category === category) return [attr.item];
  const open: number[] = [];
  for (let item = 0; item < puzzle.size.items; item++) {
    if (getMark(marks, between(attr, at(category, item))) !== 'no') open.push(item);
  }
  return open;
}

/**
 * The squares this clue forces, given what is already marked.
 *
 * The board is read on the way in, so the answer is a fixpoint: once every mark
 * listed here is down, running it again lists the same ones and no more.
 */
export function clueMarks(clue: Clue, marks: Marks, puzzle: Puzzle): RequiredMark[] {
  switch (clue.kind) {
    case 'link':
      return [{ cell: between(clue.a, clue.b), mark: clue.positive ? 'yes' : 'no' }];

    case 'groupNot':
      // One cross for every member of the described group: the whole point of
      // saying it that way is that it settles several squares at once.
      return clue.group.items.map((item) => ({
        cell: between(at(clue.group.category, item), clue.b),
        mark: 'no' as const,
      }));

    case 'either': {
      const [first, second] = clue.options;
      const required: RequiredMark[] = [];
      // Everything the entity holding `a` cannot own: the whole set bar the two
      // the clue leaves open.
      for (let item = 0; item < puzzle.size.items; item++) {
        if (item === first.item || item === second.item) continue;
        required.push({ cell: between(clue.a, at(first.category, item)), mark: 'no' });
      }
      // Two options, one ruled out: the clue names the other outright.
      if (getMark(marks, between(clue.a, first)) === 'no') {
        required.push({ cell: between(clue.a, second), mark: 'yes' });
      }
      if (getMark(marks, between(clue.a, second)) === 'no') {
        required.push({ cell: between(clue.a, first), mark: 'yes' });
      }
      return required;
    }

    case 'compare': {
      const required: RequiredMark[] = [];
      // Two entities are being compared, so they are not the same one. Two
      // attributes of one set never share an entity anyway, and have no square.
      if (clue.greater.category !== clue.lesser.category) {
        required.push({ cell: between(clue.greater, clue.lesser), mark: 'no' });
      }

      const values = valuesOf(puzzle, clue.order);
      const highOptions = candidates(marks, puzzle, clue.greater, clue.order);
      const lowOptions = candidates(marks, puzzle, clue.lesser, clue.order);
      const fits = (high: number, low: number) =>
        clue.gap === undefined ? high > low : high - low === clue.gap;

      // A value one side cannot take, because nothing left on the other side
      // would sit far enough below (or above) it.
      for (const item of highOptions) {
        if (!lowOptions.some((low) => fits(values[item], values[low]))) {
          required.push({ cell: between(clue.greater, at(clue.order, item)), mark: 'no' });
        }
      }
      for (const item of lowOptions) {
        if (!highOptions.some((high) => fits(values[high], values[item]))) {
          required.push({ cell: between(clue.lesser, at(clue.order, item)), mark: 'no' });
        }
      }
      return required;
    }
  }
}

/** Whether the board already says everything this clue says. */
export function clueDone(clue: Clue, marks: Marks, puzzle: Puzzle): boolean {
  return clueMarks(clue, marks, puzzle).every(
    (required) => getMark(marks, required.cell) === required.mark,
  );
}

/**
 * The marks standing where this clue says something else.
 *
 * `clueDone` asks whether every mark a clue calls for is down; this asks the
 * sharper question of which ones are down *the other way round*. A blank square
 * is not an argument — the clue simply has not been acted on there yet — so
 * only a mark that is present and opposite counts.
 *
 * On a full board the two questions meet: nothing is blank, so a clue that is
 * not done is a clue at least one mark contradicts, and this says which.
 */
export function clueBreaks(clue: Clue, marks: Marks, puzzle: Puzzle): RequiredMark[] {
  return clueMarks(clue, marks, puzzle).filter((required) => {
    const mark = getMark(marks, required.cell);
    return mark !== undefined && mark !== required.mark;
  });
}

/**
 * Every mark standing against a clue the player has already been told.
 *
 * The board's own shading is for marks that disagree with *each other*, and
 * never with the answer — shading a guess the solution says is wrong would hand
 * the solution over. This is the third thing, and it gives nothing away either:
 * a clue that has been read is already on the screen, so pointing at the mark it
 * argues with says only what the player could have worked out by reading it
 * again. It is behind a setting because *having* to read it again is the game.
 *
 * Only clues in `read` count. A clue nobody has asked for cannot be contradicted
 * — the player has not been told it — and flagging against one would be the
 * board playing the puzzle.
 */
export function marksAgainstClues(marks: Marks, puzzle: Puzzle, read: Iterable<number>): string[] {
  const against = new Set<string>();
  for (const index of read) {
    const clue = puzzle.clues[index];
    if (!clue) continue;
    for (const broken of clueBreaks(clue, marks, puzzle)) {
      const key = markKey(broken.cell);
      against.add(key);
      // The square a clue argues with is often not a square anybody touched: a
      // tick crosses out the rest of its row, and one of those crosses can be
      // the very cell the clue wanted ticked. Shading that cross alone points at
      // a square doing exactly what it was told. The tick that told it is the
      // mark the player can move, so it is shaded too, and the pair of them read
      // as the row they are both in.
      const from = marks[key]?.from;
      if (from) against.add(from);
    }
  }
  return [...against];
}

/** The indices of every clue the board has caught up with. */
export function cluesDone(marks: Marks, puzzle: Puzzle): Set<number> {
  const done = new Set<number>();
  puzzle.clues.forEach((clue, index) => {
    if (clueDone(clue, marks, puzzle)) done.add(index);
  });
  return done;
}

/**
 * The clue to put on the table next: the one after `current` that still has
 * something to say, wrapping round to the start. A clue passed over comes back
 * on the next lap, and `null` means every clue is used up — which is what
 * `inventClue` is for.
 */
export function nextClue(current: number | null, done: Set<number>, total: number): number | null {
  for (let step = 1; step <= total; step++) {
    const index = ((current ?? -1) + step) % total;
    if (!done.has(index)) return index;
  }
  return null;
}

/**
 * A clue nobody wrote down.
 *
 * A puzzle ships with the smallest set of clues that cracks it, so a player who
 * has used them all and is still short of the answer has nowhere to go. Rather
 * than stopping there, the game writes another: the generator's own pool holds
 * every true statement about this solution, so one is picked that the board
 * cannot already say and that has not been asked before.
 *
 * Least revealing first — a cross to rule something out, then the clues that
 * need a second thought, and a plain "X is Y" only when nothing else is left,
 * because that one hands over an answer rather than pointing at it. `attempt`
 * (how many have been written so far) keeps successive ones from repeating.
 *
 * `null` means the board already says everything true about the puzzle, which
 * on a board with no mistakes on it means the puzzle is finished.
 */
export function inventClue(puzzle: Puzzle, marks: Marks, attempt: number): Clue | null {
  const rng = createRng(puzzle.seed + attempt + 1);
  const ctx = contextFor(puzzle.categories, puzzle.size.items);
  const pools = buildPools(puzzle.solution, puzzle.categories, ctx, rng);
  const said = new Set(puzzle.clues.map(clueKey));

  for (const pool of [
    pools.negative,
    pools.either,
    pools.compare,
    pools.compareGap,
    pools.positive,
  ]) {
    const fresh = rng
      .shuffle(pool)
      .find((clue) => !said.has(clueKey(clue)) && !clueDone(clue, marks, puzzle));
    if (fresh) return fresh;
  }
  return null;
}
