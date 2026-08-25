/**
 * Puzzle generator.
 *
 * 1. Pick a theme, then categories and items from it, and roll a random
 *    solution. Every one of those picks comes from the seeded generator, so a
 *    seed rebuilds the whole puzzle — cast included.
 * 2. Build a pool of clues that are all *true* for that solution.
 * 3. Greedily add clues until plain propagation cracks the puzzle — that makes
 *    the answer unique *and* reachable without ever guessing.
 * 4. Remove every clue that is not needed, so the player gets a minimal set.
 * 5. Check the mix: link clues must carry at least three quarters of the
 *    puzzle. If they do not, build it again with the flavour spread thinner.
 */
import { resolveClueTemplates } from './describe';
import { createRng, randomSeed, type Rng } from './rng';
import { contextFor, solveByDeduction, type SolveContext } from './solver';
import type {
  Attribute,
  CategoryDef,
  Clue,
  Puzzle,
  PuzzleCategory,
  SizeOption,
  ThemeDef,
} from './types';

export interface GenerateOptions {
  /** One theme, or a pool for the generator to choose from. */
  theme: ThemeDef | ThemeDef[];
  size: SizeOption;
  seed?: number;
}

export function generatePuzzle({ theme: themeOrPool, size, seed }: GenerateOptions): Puzzle {
  const actualSeed = seed ?? randomSeed();
  const rng = createRng(actualSeed);

  const theme = Array.isArray(themeOrPool) ? rng.pick(themeOrPool) : themeOrPool;
  const categories = pickCategories(theme, size, rng);
  const solution = rollSolution(size.items, categories.length, rng);
  const ctx = contextFor(categories, size.items);
  const clues = buildClues(solution, categories, ctx, rng);

  return {
    seed: actualSeed,
    clueTemplates: resolveClueTemplates(theme),
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    accent: theme.accent,
    size,
    categories,
    solution,
    clues,
  };
}

/**
 * The anchor category always comes first. At least one ordered category is
 * included when the theme has one, so comparison clues are available; the rest
 * are drawn at random from what the theme offers.
 */
function pickCategories(theme: ThemeDef, size: SizeOption, rng: Rng): PuzzleCategory[] {
  const [anchor, ...rest] = theme.categories;
  const wanted = Math.min(size.categories, theme.categories.length) - 1;

  const ordered = rest.filter((category) => category.ordered);
  const chosen: CategoryDef[] = [];
  if (ordered.length > 0 && wanted > 0) chosen.push(rng.pick(ordered));
  for (const category of rng.shuffle(rest)) {
    if (chosen.length >= wanted) break;
    if (!chosen.includes(category)) chosen.push(category);
  }

  return [anchor, ...rng.shuffle(chosen)].map((category) =>
    sampleCategory(category, size.items, rng),
  );
}

/** Draws `size` items at random from the category's pool. */
function sampleCategory(category: CategoryDef, size: number, rng: Rng): PuzzleCategory {
  let items = rng.shuffle(category.items).slice(0, size);
  if (category.ordered) {
    // Ordered categories keep their items sorted so the grid reads naturally.
    items = items.slice().sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  }
  return {
    id: category.id,
    name: category.name,
    pattern: category.pattern,
    items,
    ordered: category.ordered,
  };
}

/** solution[category][entity]; category 0 is pinned to the identity. */
function rollSolution(size: number, categoryCount: number, rng: Rng): number[][] {
  const identity = Array.from({ length: size }, (_, index) => index);
  const solution = [identity];
  for (let c = 1; c < categoryCount; c++) solution.push(rng.shuffle(identity));
  return solution;
}

const attr = (category: number, item: number): Attribute => ({ category, item });

function entityOf(solution: number[][], category: number, item: number): number {
  return solution[category].indexOf(item);
}

function clueKey(clue: Clue): string {
  switch (clue.kind) {
    case 'link': {
      const [x, y] = [clue.a, clue.b].sort((p, q) => p.category - q.category || p.item - q.item);
      return `l${clue.positive ? '+' : '-'}:${x.category}.${x.item}:${y.category}.${y.item}`;
    }
    case 'either': {
      const [x, y] = [clue.options[0], clue.options[1]].sort((p, q) => p.item - q.item);
      return `e:${clue.a.category}.${clue.a.item}:${x.category}.${x.item}:${y.item}`;
    }
    case 'compare':
      return `c${clue.gap ?? '*'}:${clue.order}:${clue.greater.category}.${clue.greater.item}:${clue.lesser.category}.${clue.lesser.item}`;
  }
}

interface Pools {
  positive: Clue[];
  negative: Clue[];
  either: Clue[];
  compare: Clue[];
  compareGap: Clue[];
}

function buildPools(
  solution: number[][],
  categories: PuzzleCategory[],
  ctx: SolveContext,
  rng: Rng,
): Pools {
  const size = ctx.size;
  const count = ctx.categoryCount;
  const pools: Pools = { positive: [], negative: [], either: [], compare: [], compareGap: [] };

  for (let c1 = 0; c1 < count; c1++) {
    for (let c2 = c1 + 1; c2 < count; c2++) {
      for (let i1 = 0; i1 < size; i1++) {
        const entity = entityOf(solution, c1, i1);
        for (let i2 = 0; i2 < size; i2++) {
          const clue: Clue = {
            kind: 'link',
            positive: solution[c2][entity] === i2,
            a: attr(c1, i1),
            b: attr(c2, i2),
          };
          (clue.positive ? pools.positive : pools.negative).push(clue);
        }
      }
    }
  }

  // "A goes with either B or C" — one true option paired with a decoy.
  for (let entity = 0; entity < size; entity++) {
    for (let c1 = 0; c1 < count; c1++) {
      for (let c2 = 0; c2 < count; c2++) {
        if (c1 === c2 || size < 3) continue;
        const truth = solution[c2][entity];
        const decoys = Array.from({ length: size }, (_, index) => index).filter(
          (item) => item !== truth,
        );
        const decoy = rng.pick(decoys);
        const options = rng.shuffle([attr(c2, truth), attr(c2, decoy)]) as [Attribute, Attribute];
        pools.either.push({ kind: 'either', a: attr(c1, solution[c1][entity]), options });
      }
    }
  }

  // Comparisons over each ordered category.
  for (let order = 0; order < count; order++) {
    const values = ctx.values[order];
    if (!values) continue;
    for (let high = 0; high < size; high++) {
      for (let low = 0; low < size; low++) {
        const gap = values[solution[order][high]] - values[solution[order][low]];
        if (gap <= 0) continue;
        for (let ca = 0; ca < count; ca++) {
          if (ca === order) continue;
          for (let cb = 0; cb < count; cb++) {
            if (cb === order) continue;
            const greater = attr(ca, solution[ca][high]);
            const lesser = attr(cb, solution[cb][low]);
            pools.compare.push({ kind: 'compare', order, greater, lesser });
            pools.compareGap.push({ kind: 'compare', order, greater, lesser, gap });
          }
        }
      }
    }
  }

  return pools;
}

/**
 * Link clues — the plain "X is / isn't Y" statements — are what the grid is for,
 * so they carry most of the puzzle. The rest add flavour: comparisons and
 * either-ors that need a second thought before they touch the board.
 */
const MIN_LINK_SHARE = 0.75;

/** How many link clues to offer between each flavour clue, loosest first. */
const LINKS_PER_FLAVOUR = [3, 4, 6, 10, Infinity];

function linkShare(clues: Clue[]): number {
  if (clues.length === 0) return 1;
  return clues.filter((clue) => clue.kind === 'link').length / clues.length;
}

/** A few direct matches are offered up front to keep the clue list short. */
const SEED_MATCH_SHARE = 8;

/**
 * Interleaves the pools so the flavour clues get offered early enough to
 * survive minimisation, spaced by `linksPerFlavour` links either side. A
 * handful of direct matches lead, since without them a puzzle carried by links
 * alone needs half as many clues again; the rest come last and usually get
 * dropped, which is what makes the puzzles feel like puzzles.
 */
function orderPool(pools: Pools, rng: Rng, linksPerFlavour: number): Clue[] {
  const negative = rng.shuffle(pools.negative);
  const compare = rng.shuffle(pools.compare);
  const compareGap = rng.shuffle(pools.compareGap).slice(0, Math.ceil(compare.length / 3));
  const either = rng.shuffle(pools.either);
  const positive = rng.shuffle(pools.positive);

  const flavour = rng.shuffle([...compare, ...compareGap, ...either.slice(0, either.length / 2)]);
  const seeded = Math.max(1, Math.round(positive.length / SEED_MATCH_SHARE));

  const mixed: Clue[] = positive.slice(0, seeded);
  let n = 0;
  let f = 0;
  while (n < negative.length || f < flavour.length) {
    if (f < flavour.length) mixed.push(flavour[f++]);
    for (let step = 0; step < linksPerFlavour && n < negative.length; step++) {
      mixed.push(negative[n++]);
    }
  }

  return [...mixed, ...positive.slice(seeded)];
}

function buildClues(
  solution: number[][],
  categories: PuzzleCategory[],
  ctx: SolveContext,
  rng: Rng,
): Clue[] {
  const pools = buildPools(solution, categories, ctx, rng);

  // Thinning the flavour out is the only reliable way to hit the link share:
  // which clues survive is decided by the deduction, not by the offer. The last
  // rung offers links alone, so a puzzle that needs it still gets made.
  let best: Clue[] = [];
  for (const spacing of LINKS_PER_FLAVOUR) {
    const clues = assembleClues(pools, solution, ctx, rng, spacing);
    if (linkShare(clues) >= MIN_LINK_SHARE) return clues;
    if (linkShare(clues) > linkShare(best)) best = clues;
  }
  return best;
}

/** One pass: greedily take clues until propagation cracks it, then trim. */
function assembleClues(
  pools: Pools,
  solution: number[][],
  ctx: SolveContext,
  rng: Rng,
  linksPerFlavour: number,
): Clue[] {
  const pool = orderPool(pools, rng, linksPerFlavour);
  const chosen: Clue[] = [];
  const used = new Set<string>();

  for (const clue of pool) {
    const key = clueKey(clue);
    if (used.has(key)) continue;
    used.add(key);
    chosen.push(clue);
    if (solveByDeduction(chosen, ctx)) break;
  }

  // The pool always contains a full set of positive links, so this is only a
  // guard against a future pool change leaving the puzzle ambiguous.
  if (!solveByDeduction(chosen, ctx)) {
    for (let entity = 0; entity < ctx.size; entity++) {
      for (let c = 1; c < ctx.categoryCount; c++) {
        chosen.push({
          kind: 'link',
          positive: true,
          a: attr(0, solution[0][entity]),
          b: attr(c, solution[c][entity]),
        });
      }
    }
  }

  return rng.shuffle(minimise(chosen, ctx, rng));
}

/**
 * Drops every clue the deduction does not actually need, trying the flavour
 * clues first so a redundant comparison goes before a redundant link.
 */
function minimise(clues: Clue[], ctx: SolveContext, rng: Rng): Clue[] {
  const order = rng.shuffle(clues);
  const candidates = [
    ...order.filter((clue) => clue.kind !== 'link'),
    ...order.filter((clue) => clue.kind === 'link'),
  ];

  let kept = clues.slice();
  for (const clue of candidates) {
    const without = kept.filter((candidate) => candidate !== clue);
    if (without.length < kept.length && solveByDeduction(without, ctx)) kept = without;
  }
  return kept;
}
