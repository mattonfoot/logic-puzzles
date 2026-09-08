/**
 * The player's board: what they have ticked or crossed on each pair grid.
 *
 * Marks are stored flat, keyed by the two (category, item) coordinates with the
 * lower category first, so `(0,2) x (3,1)` and `(3,1) x (0,2)` are one cell.
 *
 * Every entry records who put it there. A mark the player made is `hand`; a
 * cross the board added because a tick rules out the rest of its row and column
 * is `auto`, and remembers the tick it came `from`. That distinction is what
 * keeps the two apart: automation never touches a hand mark, and taking a tick
 * away takes only the crosses that tick added.
 */
import type { Puzzle } from '../puzzle/types';

export type Mark = 'yes' | 'no';
export type MarkSource = 'hand' | 'auto';

export interface MarkEntry {
  mark: Mark;
  source: MarkSource;
  /** Auto crosses only: the key of the tick that put this here. */
  from?: string;
}

export type Marks = Record<string, MarkEntry>;

/** A mark the player made themselves. */
export const byHand = (mark: Mark): MarkEntry => ({ mark, source: 'hand' });

export interface Cell {
  c1: number;
  i1: number;
  c2: number;
  i2: number;
}

export function normalise(cell: Cell): Cell {
  return cell.c1 <= cell.c2 ? cell : { c1: cell.c2, i1: cell.i2, c2: cell.c1, i2: cell.i1 };
}

export function markKey(cell: Cell): string {
  const { c1, i1, c2, i2 } = normalise(cell);
  return `${c1}.${i1}-${c2}.${i2}`;
}

const KEY = /^(\d+)\.(\d+)-(\d+)\.(\d+)$/;

export function cellFromKey(key: string): Cell | null {
  const match = KEY.exec(key);
  if (!match) return null;
  const [c1, i1, c2, i2] = match.slice(1).map(Number);
  return { c1, i1, c2, i2 };
}

export function getEntry(marks: Marks, cell: Cell): MarkEntry | undefined {
  return marks[markKey(cell)];
}

export function getMark(marks: Marks, cell: Cell): Mark | undefined {
  return marks[markKey(cell)]?.mark;
}

/** All category pairs, in the order the tabs show them. */
export function categoryPairs(categoryCount: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let c1 = 0; c1 < categoryCount; c1++) {
    for (let c2 = c1 + 1; c2 < categoryCount; c2++) pairs.push([c1, c2]);
  }
  return pairs;
}

export interface MarkOptions {
  size: number;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate?: boolean;
  /**
   * Whether ticks that follow from other ticks are filled in: if A goes with B
   * and B goes with C, then A goes with C.
   */
  autoFacts?: boolean;
}

/**
 * Records what the player marked, then brings the automatic crosses back in
 * line. `null` takes their mark away again.
 */
export function setMark(marks: Marks, cell: Cell, mark: Mark | null, options: MarkOptions): Marks {
  const next = { ...marks };
  const key = markKey(cell);
  if (mark === null) delete next[key];
  else next[key] = byHand(mark);
  return reconcile(next, options);
}

/**
 * Rebuilds everything automatic around whatever the player has marked.
 *
 * Hand marks are kept exactly as they are, and the rest is worked out from
 * them, in the order the reasoning goes: a tick puts every attribute it names
 * in one group, so anything else already in that group is ticked too; then
 * every tick, made or worked out, crosses off the rest of its row and column.
 * Nothing is ever written over a square the player has marked, so their own
 * work survives and anything added for a tick disappears with it.
 */
export function reconcile(
  marks: Marks,
  { size, autoEliminate = true, autoFacts = false }: MarkOptions,
): Marks {
  const next: Marks = {};
  for (const [key, entry] of Object.entries(marks)) {
    if (entry.source === 'hand') next[key] = entry;
  }

  if (autoFacts) addImpliedTicks(next);
  if (!autoEliminate) return next;

  for (const [key, entry] of Object.entries(next)) {
    if (entry.mark !== 'yes') continue;
    const cell = cellFromKey(key);
    if (!cell) continue;

    const { c1, i1, c2, i2 } = cell;
    const cross = (target: Cell) => {
      const targetKey = markKey(target);
      if (!next[targetKey]) next[targetKey] = { mark: 'no', source: 'auto', from: key };
    };

    for (let item = 0; item < size; item++) {
      if (item !== i2) cross({ c1, i1, c2, i2: item });
      if (item !== i1) cross({ c1, i1: item, c2, i2 });
    }
  }

  return next;
}

/** An attribute as a node: `${category}.${item}`. */
type Node = string;

const nodeOf = (category: number, item: number): Node => `${category}.${item}`;
const cellBetween = (a: Node, b: Node): Cell => {
  const [c1, i1] = a.split('.').map(Number);
  const [c2, i2] = b.split('.').map(Number);
  return { c1, i1, c2, i2 };
};

/**
 * Fills in the ticks that follow from the ticks already on the board.
 *
 * A tick says two attributes belong to the same entity, so ticks chain: read
 * them as edges and every connected group is one entity, whose members are all
 * paired with each other. Each square that names two of them and is still empty
 * gets a tick, remembering the tick that brought the second attribute into the
 * group.
 *
 * Two attributes from the same set can only land in one group on a board that
 * has already gone wrong; those pairs are left alone rather than marked with a
 * pairing that cannot exist.
 */
function addImpliedTicks(marks: Marks): void {
  const edges = new Map<Node, { to: Node; via: string }[]>();
  const link = (from: Node, to: Node, via: string) => {
    const list = edges.get(from);
    if (list) list.push({ to, via });
    else edges.set(from, [{ to, via }]);
  };

  for (const [key, entry] of Object.entries(marks)) {
    if (entry.mark !== 'yes') continue;
    const cell = cellFromKey(key);
    if (!cell) continue;
    link(nodeOf(cell.c1, cell.i1), nodeOf(cell.c2, cell.i2), key);
    link(nodeOf(cell.c2, cell.i2), nodeOf(cell.c1, cell.i1), key);
  }

  const seen = new Set<Node>();
  for (const start of edges.keys()) {
    if (seen.has(start)) continue;

    // The whole group, each member with the tick that reached it.
    const group: { node: Node; via: string }[] = [{ node: start, via: '' }];
    seen.add(start);
    for (let index = 0; index < group.length; index++) {
      for (const edge of edges.get(group[index].node) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        group.push({ node: edge.to, via: edge.via });
      }
    }

    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        const cell = cellBetween(group[a].node, group[b].node);
        if (cell.c1 === cell.c2) continue;
        const key = markKey(cell);
        if (marks[key]) continue;
        marks[key] = { mark: 'yes', source: 'auto', from: group[b].via || group[a].via };
      }
    }
  }
}

/** Cycles a cell through blank → cross → tick → blank. */
export function nextMark(current: Mark | undefined): Mark | null {
  if (current === undefined) return 'no';
  if (current === 'no') return 'yes';
  return null;
}

export function correctItem(puzzle: Puzzle, c1: number, i1: number, c2: number): number {
  const entity = puzzle.solution[c1].indexOf(i1);
  return puzzle.solution[c2][entity];
}

export function isCorrectPair(puzzle: Puzzle, cell: Cell): boolean {
  return correctItem(puzzle, cell.c1, cell.i1, cell.c2) === cell.i2;
}

/**
 * Cells whose mark contradicts the real solution.
 *
 * This knows the answer, so it is only for the boards that are allowed to: the
 * lessons, where the whole point is telling somebody the square they marked is
 * not the one the clue was about. **A real game must never use it.** Shading
 * marks that disagree with the solution hands the solution over — fill a grid
 * in at random, see what turns red, and the puzzle has told you where the ticks
 * go. `findConflicts` is the one a game asks.
 */
export function findMistakes(marks: Marks, puzzle: Puzzle): string[] {
  const mistakes: string[] = [];
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        const cell = { c1, i1, c2, i2 };
        const mark = getMark(marks, cell);
        if (!mark) continue;
        const truth = isCorrectPair(puzzle, cell) ? 'yes' : 'no';
        if (mark !== truth) mistakes.push(markKey(cell));
      }
    }
  }
  return mistakes;
}

/**
 * Marks that cannot all be true at once, read off each other and nothing else.
 *
 * This never looks at `puzzle.solution` — only at `size` and how many sets
 * there are — and that is the whole point of it. The board used to be checked
 * against the answer, which meant the game would shade a wrong guess: filling
 * a grid in at random and reading the red squares was faster than solving it.
 * A contradiction is different information. It says *you have said two things
 * that cannot both hold*, which the player could have worked out themselves,
 * and it says nothing whatever about which of them is the wrong one.
 *
 * Three things can go wrong, and all three are about marks disagreeing:
 *
 * 1. **A chain of ticks that pairs one thing with two.** Ticks say "these are
 *    the same person", so they join up: tick Indra to the gloves and the gloves
 *    to 30m, and Indra is at 30m whether or not anybody ticked it. If that
 *    chain ever reaches two items of one set, it has said one person owns both,
 *    which no board allows.
 * 2. **A cross inside such a chain.** The same chain says two things are the
 *    same person; a cross across it says they are not.
 * 3. **A row or a column with nothing left in it.** Every square crossed means
 *    that item pairs with nothing in the other set, and everything pairs with
 *    exactly one thing.
 *
 * What comes back is every mark caught up in a contradiction — for a chain,
 * the ticks along the path between the two ends, plus the cross if there is
 * one. Not "the wrong one", because there is no such thing here: the player
 * said several things that disagree, and which to take back is theirs to
 * decide.
 */
export function findConflicts(marks: Marks, puzzle: Puzzle): string[] {
  const size = puzzle.size.items;
  const count = puzzle.categories.length;
  const flagged = new Set<string>();

  // Every tick as an edge between two attributes. A tick is a claim that the
  // two belong to the same entity, so the ticks are a graph and each connected
  // piece of it is one entity as far as the board has been told.
  const links = new Map<Node, { to: Node; key: string }[]>();
  const join = (from: Node, to: Node, key: string) => {
    const found = links.get(from);
    if (found) found.push({ to, key });
    else links.set(from, [{ to, key }]);
  };
  for (const [key, entry] of Object.entries(marks)) {
    if (entry.mark !== 'yes') continue;
    const cell = cellFromKey(key);
    if (!cell) continue;
    join(nodeOf(cell.c1, cell.i1), nodeOf(cell.c2, cell.i2), key);
    join(nodeOf(cell.c2, cell.i2), nodeOf(cell.c1, cell.i1), key);
  }

  /** The ticks between two attributes, or null when nothing joins them. */
  const pathBetween = (from: Node, to: Node): string[] | null => {
    if (from === to) return [];
    const back = new Map<Node, { via: Node; key: string }>();
    const queue: Node[] = [from];
    const seen = new Set<Node>([from]);
    for (let at = 0; at < queue.length; at++) {
      for (const edge of links.get(queue[at]) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        back.set(edge.to, { via: queue[at], key: edge.key });
        if (edge.to === to) {
          const keys: string[] = [];
          for (let node = to; node !== from;) {
            const step = back.get(node);
            if (!step) break;
            keys.push(step.key);
            node = step.via;
          }
          return keys;
        }
        queue.push(edge.to);
      }
    }
    return null;
  };

  // 1. A chain that reaches two items of the same set has paired one thing
  //    with two of something, which is the one thing a grid cannot hold.
  const walked = new Set<Node>();
  for (const start of links.keys()) {
    if (walked.has(start)) continue;
    const group: Node[] = [start];
    walked.add(start);
    for (let at = 0; at < group.length; at++) {
      for (const edge of links.get(group[at]) ?? []) {
        if (walked.has(edge.to)) continue;
        walked.add(edge.to);
        group.push(edge.to);
      }
    }
    const byCategory = new Map<number, Node>();
    for (const node of group) {
      const category = Number(node.split('.')[0]);
      const already = byCategory.get(category);
      if (already === undefined) {
        byCategory.set(category, node);
        continue;
      }
      for (const key of pathBetween(already, node) ?? []) flagged.add(key);
    }
  }

  // 2. A cross laid across a chain that says those two are the same entity.
  for (const [key, entry] of Object.entries(marks)) {
    if (entry.mark !== 'no') continue;
    const cell = cellFromKey(key);
    if (!cell) continue;
    const path = pathBetween(nodeOf(cell.c1, cell.i1), nodeOf(cell.c2, cell.i2));
    if (!path) continue;
    flagged.add(key);
    for (const along of path) flagged.add(along);
  }

  // 3. A row or a column crossed right through, which leaves its item paired
  //    with nothing at all.
  for (const [c1, c2] of categoryPairs(count)) {
    for (let index = 0; index < size; index++) {
      const row = Array.from({ length: size }, (_, other) => ({ c1, i1: index, c2, i2: other }));
      const column = Array.from({ length: size }, (_, other) => ({ c1, i1: other, c2, i2: index }));
      for (const line of [row, column]) {
        if (line.every((cell) => getMark(marks, cell) === 'no')) {
          for (const cell of line) flagged.add(markKey(cell));
        }
      }
    }
  }

  return [...flagged];
}

/**
 * Whether what is on the board can all be true at once.
 *
 * Not whether it is *right* — a board can be wrong from end to end and perfectly
 * consistent, and the game has no business saying so until the player has been
 * told enough to know it themselves.
 */
export function isSolvable(marks: Marks, puzzle: Puzzle): boolean {
  return findConflicts(marks, puzzle).length === 0;
}

/**
 * The board with the marks caught in a contradiction taken off.
 *
 * Taking one mark off a contradiction is enough to settle it, and which one is
 * the player's business — so this takes them all rather than choosing for them,
 * and only the ones they made by hand, since the rest come back off those.
 * Removing a mark can uncover another disagreement underneath, so it goes round
 * again until the board is quiet or there is nothing of the player's left.
 */
export function clearMistakes(marks: Marks, puzzle: Puzzle, options: MarkOptions): Marks {
  let board = marks;
  // One pass per hand mark is more than it can ever need.
  for (let round = 0; round <= Object.keys(marks).length; round++) {
    const conflicts = new Set(findConflicts(board, puzzle));
    if (conflicts.size === 0) return board;
    const kept: Marks = {};
    let dropped = false;
    for (const [key, entry] of Object.entries(board)) {
      if (entry.source === 'hand' && conflicts.has(key)) {
        dropped = true;
        continue;
      }
      kept[key] = entry;
    }
    if (!dropped) return reconcile(kept, options);
    board = reconcile(kept, options);
  }
  return board;
}

/** Every true pairing is ticked and nothing false is. */
export function isSolved(marks: Marks, puzzle: Puzzle): boolean {
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        const cell = { c1, i1, c2, i2 };
        const mark = getMark(marks, cell);
        if (isCorrectPair(puzzle, cell)) {
          if (mark !== 'yes') return false;
        } else if (mark === 'yes') {
          return false;
        }
      }
    }
  }
  return true;
}

/** How much of the board is filled in correctly, as a 0–1 fraction. */
export function progress(marks: Marks, puzzle: Puzzle): number {
  const pairs = categoryPairs(puzzle.categories.length);
  const total = pairs.length * puzzle.size.items;
  let done = 0;
  for (const [c1, c2] of pairs) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      const i2 = correctItem(puzzle, c1, i1, c2);
      if (getMark(marks, { c1, i1, c2, i2 }) === 'yes') done++;
    }
  }
  return total === 0 ? 0 : done / total;
}

/** The finished board, as though the player had marked every square. */
export function solvedMarks(puzzle: Puzzle): Marks {
  const marks: Marks = {};
  for (const [c1, c2] of categoryPairs(puzzle.categories.length)) {
    for (let i1 = 0; i1 < puzzle.size.items; i1++) {
      for (let i2 = 0; i2 < puzzle.size.items; i2++) {
        marks[markKey({ c1, i1, c2, i2 })] = byHand(
          isCorrectPair(puzzle, { c1, i1, c2, i2 }) ? 'yes' : 'no',
        );
      }
    }
  }
  return marks;
}
