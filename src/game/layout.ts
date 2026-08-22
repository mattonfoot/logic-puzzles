/**
 * The classic logic-grid arrangement.
 *
 * A puzzle with N sets is drawn as one staircase of blocks: the sets 1…N-1 run
 * across the top as columns, and sets 0, N-1, N-2, … 2 run down the side as
 * rows. Every pair of sets meets in exactly one block, so a four-set puzzle is
 * a 3 × 3 arrangement holding six blocks, and each block is an items × items
 * grid of ticks and crosses.
 *
 *            Destination     Ship        Launch
 *   Astronaut  ■■■■          ■■■■        ■■■■
 *   Launch     ■■■■          ■■■■
 *   Ship       ■■■■
 */
import type { ItemDef, Puzzle } from '../puzzle/types';

export interface GridBlock {
  /** Index into `rowCategories` / `colCategories`. */
  row: number;
  col: number;
  /** The categories this block cross-references. */
  rowCategory: number;
  colCategory: number;
}

export interface BoardLayout {
  /** Category per block row, top to bottom. */
  rowCategories: number[];
  /** Category per block column, left to right. */
  colCategories: number[];
  blocks: GridBlock[];
}

export function boardLayout(categoryCount: number): BoardLayout {
  // Columns run forwards from the second set; rows start with the anchor set
  // and then run backwards, which is what gives the staircase its shape.
  const colCategories = Array.from({ length: categoryCount - 1 }, (_, index) => index + 1);
  const rowCategories = [
    0,
    ...Array.from({ length: categoryCount - 2 }, (_, index) => categoryCount - 1 - index),
  ];

  const blocks: GridBlock[] = [];
  rowCategories.forEach((rowCategory, row) => {
    colCategories.forEach((colCategory, col) => {
      // The anchor row meets every column; the rest only meet the columns to
      // their left, so no pair of sets is drawn twice.
      if (rowCategory === 0 || colCategory < rowCategory) {
        blocks.push({ row, col, rowCategory, colCategory });
      }
    });
  });

  return { rowCategories, colCategories, blocks };
}

export interface SolutionCell {
  category: number;
  item: number;
  label: string;
}

/**
 * The finished puzzle as a table: one row per entity, one column per set, in
 * the order the sets appear in the puzzle. Rows are ordered by the ordered set
 * (earliest year, cheapest bill…) when there is one, so the summary reads the
 * way the answer key of a printed puzzle does.
 */
export function solutionRows(puzzle: Puzzle): SolutionCell[][] {
  const orderedCategory = puzzle.categories.findIndex((category) => category.ordered);
  const sortBy = orderedCategory === -1 ? 0 : orderedCategory;

  const entities = Array.from({ length: puzzle.size.items }, (_, entity) => entity).sort(
    (a, b) => puzzle.solution[sortBy][a] - puzzle.solution[sortBy][b],
  );

  return entities.map((entity) =>
    puzzle.categories.map((category, index) => {
      const item: ItemDef = category.items[puzzle.solution[index][entity]];
      return { category: index, item: puzzle.solution[index][entity], label: item.label };
    }),
  );
}
