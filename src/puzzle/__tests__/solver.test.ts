import { contextFor, satisfiesAll, solve, solveByDeduction } from '../solver';
import type { Clue, PuzzleCategory } from '../types';

const categories: PuzzleCategory[] = [
  {
    id: 'person',
    name: 'Person',
    pattern: '{}',
    items: [{ label: 'Ann' }, { label: 'Bo' }, { label: 'Cy' }],
  },
  {
    id: 'pet',
    name: 'Pet',
    pattern: 'the {} owner',
    items: [{ label: 'Cat' }, { label: 'Dog' }, { label: 'Newt' }],
  },
  {
    id: 'age',
    name: 'Age',
    pattern: 'the {} year old',
    items: [
      { label: '7', value: 7 },
      { label: '9', value: 9 },
      { label: '11', value: 11 },
    ],
    ordered: { noun: 'age', unit: 'years', greater: 'older', lesser: 'younger' },
  },
];

const ctx = contextFor(categories, 3);

describe('solve', () => {
  it('reports every arrangement when there are no clues', () => {
    // Category 0 is pinned, so 3 pets x 3 ages = 36 arrangements.
    expect(solve([], ctx, 100).count).toBe(36);
  });

  it('narrows to a single solution from positive and negative links', () => {
    const clues: Clue[] = [
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
      { kind: 'link', positive: false, a: { category: 0, item: 1 }, b: { category: 1, item: 1 } },
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 2, item: 2 } },
      { kind: 'link', positive: false, a: { category: 0, item: 1 }, b: { category: 2, item: 0 } },
    ];
    const result = solve(clues, ctx, 5);
    expect(result.count).toBe(1);
    expect(result.solution).toEqual([
      [0, 1, 2],
      [0, 2, 1],
      [2, 1, 0],
    ]);
  });

  it('honours strict comparisons', () => {
    const clues: Clue[] = [
      // The cat owner is older than Ann, and Ann is older than the dog owner.
      {
        kind: 'compare',
        order: 2,
        greater: { category: 1, item: 0 },
        lesser: { category: 0, item: 0 },
      },
      {
        kind: 'compare',
        order: 2,
        greater: { category: 0, item: 0 },
        lesser: { category: 1, item: 1 },
      },
    ];
    // Ann owns neither pet and is stuck in the middle of the age order, which
    // leaves only the two ways of handing the cat and dog to Bo and Cy.
    const result = solve(clues, ctx, 100);
    expect(result.count).toBe(2);
    expect(satisfiesAll(clues, result.solution!, ctx)).toBe(true);
    expect(result.solution![1][0]).toBe(2);
    expect(result.solution![2][0]).toBe(1);
  });

  it('honours exact gaps', () => {
    const clues: Clue[] = [
      {
        kind: 'compare',
        order: 2,
        greater: { category: 1, item: 0 },
        lesser: { category: 1, item: 1 },
        gap: 4,
      },
    ];
    const result = solve(clues, ctx, 100);
    expect(result.count).toBe(6);
    expect(satisfiesAll(clues, result.solution!, ctx)).toBe(true);
  });

  it('handles either-or clues', () => {
    const clues: Clue[] = [
      {
        kind: 'either',
        a: { category: 0, item: 0 },
        options: [
          { category: 1, item: 0 },
          { category: 1, item: 1 },
        ],
      },
    ];
    const result = solve(clues, ctx, 100);
    // Ann may not own the newt, leaving 2 pet arrangements x 6 age arrangements.
    expect(result.count).toBe(24);
  });

  it('deduces the answer when propagation is enough', () => {
    const clues: Clue[] = [
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
      { kind: 'link', positive: false, a: { category: 0, item: 1 }, b: { category: 1, item: 1 } },
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 2, item: 2 } },
      { kind: 'link', positive: false, a: { category: 0, item: 1 }, b: { category: 2, item: 0 } },
    ];
    expect(solveByDeduction(clues, ctx)).toEqual([
      [0, 1, 2],
      [0, 2, 1],
      [2, 1, 0],
    ]);
  });

  it('refuses to deduce when a guess would be needed', () => {
    const clues: Clue[] = [
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
    ];
    expect(solveByDeduction(clues, ctx)).toBeNull();
  });

  it('detects contradictions', () => {
    const clues: Clue[] = [
      { kind: 'link', positive: true, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
      { kind: 'link', positive: false, a: { category: 0, item: 0 }, b: { category: 1, item: 0 } },
    ];
    expect(solve(clues, ctx, 5).count).toBe(0);
  });
});
