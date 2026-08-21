/**
 * Constraint solver for the logic grids.
 *
 * State is a candidate matrix `cand[category][entity]`: a bitmask of the items
 * that entity could still own, held in one flat Int32Array so branching is a
 * cheap copy. Solving alternates between
 *  1. propagation — sound rules that shrink the masks, and
 *  2. search — branch on the most constrained cell.
 *
 * Propagation is deliberately allowed to be incomplete (the comparison rules
 * only prune the obvious cases), so every complete assignment is re-checked
 * against the clues with `satisfies` before it counts as a solution.
 */
import type { Attribute, Clue, PuzzleCategory } from './types';

export interface SolveContext {
  size: number;
  categoryCount: number;
  /** values[category][item] for ordered categories, undefined elsewhere. */
  values: (number[] | undefined)[];
}

export interface SolveResult {
  /** Number of solutions found, capped at the requested limit. */
  count: number;
  /** First solution found, as solution[category][entity] = item. */
  solution: number[][] | null;
}

export function contextFor(categories: PuzzleCategory[], size: number): SolveContext {
  return {
    size,
    categoryCount: categories.length,
    values: categories.map((category) =>
      category.ordered ? category.items.map((item, index) => item.value ?? index) : undefined,
    ),
  };
}

const bit = (index: number) => 1 << index;

function popcount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}

function lowestBitIndex(mask: number): number {
  return 31 - Math.clz32(mask & -mask);
}

/** The candidate matrix plus the "did anything change" bookkeeping. */
class Grid {
  changed = false;
  broken = false;

  constructor(
    readonly size: number,
    readonly categoryCount: number,
    readonly cand: Int32Array,
  ) {}

  static initial(ctx: SolveContext): Grid {
    const cand = new Int32Array(ctx.categoryCount * ctx.size);
    const full = bit(ctx.size) - 1;
    for (let c = 0; c < ctx.categoryCount; c++) {
      for (let e = 0; e < ctx.size; e++) {
        // Category 0 is pinned to the identity: entity e owns item e. That
        // removes the symmetry of relabelling entities.
        cand[c * ctx.size + e] = c === 0 ? bit(e) : full;
      }
    }
    return new Grid(ctx.size, ctx.categoryCount, cand);
  }

  at(category: number, entity: number): number {
    return this.cand[category * this.size + entity];
  }

  restrict(category: number, entity: number, mask: number): void {
    const index = category * this.size + entity;
    const before = this.cand[index];
    const after = before & mask;
    if (after === before) return;
    this.cand[index] = after;
    this.changed = true;
    if (after === 0) this.broken = true;
  }

  remove(category: number, entity: number, item: number): void {
    this.restrict(category, entity, ~bit(item));
  }

  /** Bitmask of the entities that could still hold `attr`. */
  entities(attr: Attribute): number {
    const base = attr.category * this.size;
    const item = bit(attr.item);
    let mask = 0;
    for (let e = 0; e < this.size; e++) {
      if (this.cand[base + e] & item) mask |= bit(e);
    }
    return mask;
  }

  branch(category: number, entity: number, item: number): Grid {
    const copy = new Grid(this.size, this.categoryCount, this.cand.slice());
    copy.cand[category * this.size + entity] = bit(item);
    return copy;
  }
}

/** Each item belongs to exactly one entity, and each entity to one item. */
function applyLatinRules(grid: Grid): void {
  const { size, categoryCount, cand } = grid;
  for (let c = 0; c < categoryCount; c++) {
    const base = c * size;
    for (let e = 0; e < size; e++) {
      const mask = cand[base + e];
      if (mask === 0) {
        grid.broken = true;
        return;
      }
      if (popcount(mask) !== 1) continue;
      for (let other = 0; other < size; other++) {
        if (other !== e) grid.restrict(c, other, ~mask);
      }
    }
    for (let item = 0; item < size; item++) {
      const itemMask = bit(item);
      let owner = -1;
      let count = 0;
      for (let e = 0; e < size; e++) {
        if (cand[base + e] & itemMask) {
          owner = e;
          count++;
        }
      }
      if (count === 0) {
        grid.broken = true;
        return;
      }
      if (count === 1) grid.restrict(c, owner, itemMask);
    }
  }
}

/**
 * Which values of the ordered category entity `e` may still take, given that it
 * must beat (or be beaten by) one of `partners`.
 */
function allowedOrderMask(
  grid: Grid,
  order: number,
  values: number[],
  entity: number,
  partners: number,
  gap: number | undefined,
  role: 'greater' | 'lesser',
): number {
  let allowed = 0;
  let own = grid.at(order, entity);
  while (own) {
    const item = lowestBitIndex(own);
    own &= own - 1;
    const value = values[item];
    let partnerBits = partners;
    while (partnerBits) {
      const partner = lowestBitIndex(partnerBits);
      partnerBits &= partnerBits - 1;
      if (partner === entity) continue;
      let theirs = grid.at(order, partner);
      while (theirs) {
        const theirItem = lowestBitIndex(theirs);
        theirs &= theirs - 1;
        const other = values[theirItem];
        const high = role === 'greater' ? value : other;
        const low = role === 'greater' ? other : value;
        if (gap === undefined ? high > low : high - low === gap) {
          allowed |= bit(item);
          partnerBits = 0;
          theirs = 0;
        }
      }
    }
  }
  return allowed;
}

function applyClue(clue: Clue, grid: Grid, ctx: SolveContext): void {
  switch (clue.kind) {
    case 'link': {
      const ea = grid.entities(clue.a);
      const eb = grid.entities(clue.b);
      if (clue.positive) {
        // Both attributes sit on one entity, so each is limited to the entities
        // the other one can still reach.
        let onlyA = ea & ~eb;
        while (onlyA) {
          const e = lowestBitIndex(onlyA);
          onlyA &= onlyA - 1;
          grid.remove(clue.a.category, e, clue.a.item);
        }
        let onlyB = eb & ~ea;
        while (onlyB) {
          const e = lowestBitIndex(onlyB);
          onlyB &= onlyB - 1;
          grid.remove(clue.b.category, e, clue.b.item);
        }
      } else {
        if (popcount(ea) === 1) grid.remove(clue.b.category, lowestBitIndex(ea), clue.b.item);
        if (popcount(eb) === 1) grid.remove(clue.a.category, lowestBitIndex(eb), clue.a.item);
      }
      return;
    }
    case 'either': {
      const [first, second] = clue.options;
      const optionMask = bit(first.item) | bit(second.item);
      const optionCategory = first.category;
      let ea = grid.entities(clue.a);
      if (popcount(ea) === 1) grid.restrict(optionCategory, lowestBitIndex(ea), optionMask);
      while (ea) {
        const e = lowestBitIndex(ea);
        ea &= ea - 1;
        if ((grid.at(optionCategory, e) & optionMask) === 0) {
          grid.remove(clue.a.category, e, clue.a.item);
        }
      }
      return;
    }
    case 'compare': {
      const values = ctx.values[clue.order];
      if (!values) return;
      const greaterEntities = grid.entities(clue.greater);
      const lesserEntities = grid.entities(clue.lesser);

      let high = greaterEntities;
      while (high) {
        const e = lowestBitIndex(high);
        high &= high - 1;
        if (allowedOrderMask(grid, clue.order, values, e, lesserEntities, clue.gap, 'greater') === 0) {
          grid.remove(clue.greater.category, e, clue.greater.item);
        }
      }
      let low = lesserEntities;
      while (low) {
        const e = lowestBitIndex(low);
        low &= low - 1;
        if (allowedOrderMask(grid, clue.order, values, e, greaterEntities, clue.gap, 'lesser') === 0) {
          grid.remove(clue.lesser.category, e, clue.lesser.item);
        }
      }
      // Once an attribute is pinned to a single entity, the values that entity
      // may take in the ordered category can be pruned too.
      if (popcount(greaterEntities) === 1) {
        const e = lowestBitIndex(greaterEntities);
        grid.restrict(
          clue.order,
          e,
          allowedOrderMask(grid, clue.order, values, e, lesserEntities, clue.gap, 'greater'),
        );
      }
      if (popcount(lesserEntities) === 1) {
        const e = lowestBitIndex(lesserEntities);
        grid.restrict(
          clue.order,
          e,
          allowedOrderMask(grid, clue.order, values, e, greaterEntities, clue.gap, 'lesser'),
        );
      }
      return;
    }
  }
}

/** Runs propagation to a fixpoint. Returns false on a contradiction. */
function propagate(grid: Grid, clues: Clue[], ctx: SolveContext): boolean {
  for (;;) {
    grid.changed = false;
    applyLatinRules(grid);
    if (grid.broken) return false;
    for (let index = 0; index < clues.length; index++) {
      applyClue(clues[index], grid, ctx);
      if (grid.broken) return false;
    }
    if (!grid.changed) return true;
  }
}

function entityOf(solution: number[][], attr: Attribute): number {
  return solution[attr.category].indexOf(attr.item);
}

/** Exact check of one clue against a complete assignment. */
export function satisfies(clue: Clue, solution: number[][], ctx: SolveContext): boolean {
  switch (clue.kind) {
    case 'link': {
      const same = entityOf(solution, clue.a) === entityOf(solution, clue.b);
      return clue.positive ? same : !same;
    }
    case 'either': {
      const entity = entityOf(solution, clue.a);
      const owned = solution[clue.options[0].category][entity];
      return owned === clue.options[0].item || owned === clue.options[1].item;
    }
    case 'compare': {
      const values = ctx.values[clue.order];
      if (!values) return true;
      const high = values[solution[clue.order][entityOf(solution, clue.greater)]];
      const low = values[solution[clue.order][entityOf(solution, clue.lesser)]];
      return clue.gap === undefined ? high > low : high - low === clue.gap;
    }
  }
}

export function satisfiesAll(clues: Clue[], solution: number[][], ctx: SolveContext): boolean {
  return clues.every((clue) => satisfies(clue, solution, ctx));
}

function toSolution(grid: Grid): number[][] {
  const solution: number[][] = [];
  for (let c = 0; c < grid.categoryCount; c++) {
    const row: number[] = [];
    for (let e = 0; e < grid.size; e++) row.push(lowestBitIndex(grid.at(c, e)));
    solution.push(row);
  }
  return solution;
}

/**
 * Counts solutions of `clues`, stopping as soon as `limit` have been found.
 * A limit of 2 is all the generator needs to test for uniqueness.
 */
export function solve(clues: Clue[], ctx: SolveContext, limit = 2): SolveResult {
  let count = 0;
  let first: number[][] | null = null;

  const search = (grid: Grid): void => {
    if (!propagate(grid, clues, ctx)) return;

    // Most constrained cell first — category 0 is pinned, so skip it.
    let bestCategory = -1;
    let bestEntity = -1;
    let bestSize = Number.MAX_SAFE_INTEGER;
    for (let c = 1; c < ctx.categoryCount; c++) {
      for (let e = 0; e < ctx.size; e++) {
        const size = popcount(grid.at(c, e));
        if (size > 1 && size < bestSize) {
          bestSize = size;
          bestCategory = c;
          bestEntity = e;
          if (size === 2) break;
        }
      }
    }

    if (bestCategory === -1) {
      const solution = toSolution(grid);
      if (!satisfiesAll(clues, solution, ctx)) return;
      count++;
      if (!first) first = solution;
      return;
    }

    let options = grid.at(bestCategory, bestEntity);
    while (options) {
      const item = lowestBitIndex(options);
      options &= options - 1;
      search(grid.branch(bestCategory, bestEntity, item));
      if (count >= limit) return;
    }
  };

  search(Grid.initial(ctx));
  return { count, solution: first };
}

export function hasUniqueSolution(clues: Clue[], ctx: SolveContext): boolean {
  return solve(clues, ctx, 2).count === 1;
}

/**
 * Solves using propagation only — no branching, no guessing.
 *
 * This is what the generator builds against: a clue set that falls out under
 * pure propagation is both provably unique *and* solvable by a player who never
 * has to guess. It is also cheap, which keeps generation snappy on a phone.
 */
export function solveByDeduction(clues: Clue[], ctx: SolveContext): number[][] | null {
  const grid = Grid.initial(ctx);
  if (!propagate(grid, clues, ctx)) return null;
  for (let c = 0; c < ctx.categoryCount; c++) {
    for (let e = 0; e < ctx.size; e++) {
      if (popcount(grid.at(c, e)) !== 1) return null;
    }
  }
  const solution = toSolution(grid);
  return satisfiesAll(clues, solution, ctx) ? solution : null;
}
