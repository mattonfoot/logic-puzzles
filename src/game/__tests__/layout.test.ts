import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { categoryPairs } from '../board';
import { boardLayout, solutionRows } from '../layout';

describe('boardLayout', () => {
  it('arranges four sets as a 3 × 3 staircase of six blocks', () => {
    const layout = boardLayout(4);

    expect(layout.colCategories).toEqual([1, 2, 3]);
    expect(layout.rowCategories).toEqual([0, 3, 2]);
    expect(layout.blocks).toHaveLength(6);

    // Row 0 (the anchor set) meets every column; each later row one fewer.
    const perRow = [0, 1, 2].map(
      (row) => layout.blocks.filter((block) => block.row === row).length,
    );
    expect(perRow).toEqual([3, 2, 1]);
  });

  it('arranges three sets as a 2 × 2 staircase of three blocks', () => {
    const layout = boardLayout(3);
    expect(layout.colCategories).toEqual([1, 2]);
    expect(layout.rowCategories).toEqual([0, 2]);
    expect(layout.blocks.map((block) => [block.rowCategory, block.colCategory])).toEqual([
      [0, 1],
      [0, 2],
      [2, 1],
    ]);
  });

  it('draws every pair of sets exactly once', () => {
    for (const categoryCount of [3, 4, 5]) {
      const layout = boardLayout(categoryCount);
      const drawn = layout.blocks.map((block) =>
        [block.rowCategory, block.colCategory].sort((a, b) => a - b).join('-'),
      );
      const expected = categoryPairs(categoryCount).map((pair) => pair.join('-'));

      expect(new Set(drawn).size).toBe(drawn.length);
      expect(drawn.slice().sort()).toEqual(expected.slice().sort());
    }
  });

  it('never puts a set against itself', () => {
    for (const block of boardLayout(5).blocks) {
      expect(block.rowCategory).not.toBe(block.colCategory);
    }
  });
});

describe('solutionRows', () => {
  const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[1], seed: 4242 });

  it('gives one row per entity and one column per set', () => {
    const rows = solutionRows(puzzle);
    expect(rows).toHaveLength(puzzle.size.items);
    for (const row of rows) {
      expect(row).toHaveLength(puzzle.categories.length);
      row.forEach((cell, index) => expect(cell.category).toBe(index));
    }
  });

  it('lists the items that actually belong together', () => {
    for (const row of solutionRows(puzzle)) {
      const entity = puzzle.solution[0].indexOf(row[0].item);
      for (const cell of row) {
        expect(puzzle.solution[cell.category][entity]).toBe(cell.item);
        expect(cell.label).toBe(puzzle.categories[cell.category].items[cell.item].label);
      }
    }
  });

  it('uses every item of every set exactly once', () => {
    const rows = solutionRows(puzzle);
    puzzle.categories.forEach((category, index) => {
      const used = rows.map((row) => row[index].item).sort();
      expect(used).toEqual(category.items.map((_, item) => item));
    });
  });

  it('orders the rows by the ordered set when there is one', () => {
    const ordered = puzzle.categories.findIndex((category) => category.ordered);
    expect(ordered).toBeGreaterThan(-1);
    const values = solutionRows(puzzle).map((row) => row[ordered].item);
    expect(values).toEqual(values.slice().sort((a, b) => a - b));
  });
});
