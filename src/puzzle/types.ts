/**
 * Core data model for the logic-grid puzzles.
 *
 * A puzzle has `size` entities (rows) and `categories.length` categories.
 * Every entity owns exactly one item from every category, and no two entities
 * share an item. Category 0 is the "anchor" category (usually the people):
 * entity `e` always owns item `e` of category 0, which removes the symmetry of
 * relabelling entities and keeps solution counting honest.
 */

/** One value inside a category, e.g. "Mars" or "2031". */
export interface ItemDef {
  label: string;
  /** Ordered categories only: the numeric value used by comparison clues. */
  value?: number;
}

/** Extra metadata that turns a category into an ordered (comparable) one. */
export interface OrderedMeta {
  /** How the category is spoken about in a clue, e.g. "launch year". */
  noun: string;
  /** Plural unit for exact-gap clues, e.g. "years". */
  unit: string;
  /** Comparative for a bigger value, e.g. "later". */
  greater: string;
  /** Comparative for a smaller value, e.g. "earlier". */
  lesser: string;
}

export interface CategoryDef {
  id: string;
  /** Short label used as a grid header, e.g. "Spacecraft". */
  name: string;
  /** Sentence fragment for clue text; `{}` is replaced by the item label. */
  pattern: string;
  items: ItemDef[];
  ordered?: OrderedMeta;
}

export interface ThemeDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Accent colour used across the UI when this theme is in play. */
  accent: string;
  /** The first category is always the anchor category. */
  categories: CategoryDef[];
}

/** A category after it has been sampled down to the puzzle's size. */
export interface PuzzleCategory {
  id: string;
  name: string;
  pattern: string;
  items: ItemDef[];
  ordered?: OrderedMeta;
}

/** Points at one item of one category, e.g. category 2 / item 0. */
export interface Attribute {
  category: number;
  item: number;
}

export type Clue =
  /** The two attributes belong to the same entity (positive) or not (negative). */
  | { kind: 'link'; positive: boolean; a: Attribute; b: Attribute }
  /** The entity holding `a` also holds one of `options` (same category, two items). */
  | { kind: 'either'; a: Attribute; options: [Attribute, Attribute] }
  /**
   * In ordered category `order`, the entity holding `greater` has a strictly
   * larger value than the entity holding `lesser`. When `gap` is set the
   * difference is exactly that many units.
   */
  | { kind: 'compare'; order: number; greater: Attribute; lesser: Attribute; gap?: number };

/**
 * The shape of a puzzle: how many sets take part and how many items each set
 * holds. One grid is drawn per pair of sets, so `sets` drives the number of
 * grids and `items` the size of each one.
 */
export interface SizeOption {
  /** Stable `${sets}x${items}` key, used to group statistics. */
  id: string;
  /** How many sets (categories) take part. */
  sets: number;
  /** How many items in each set — also the number of entities. */
  items: number;
  /** Compact "4 × 5", read as sets × items. */
  label: string;
  /** Spelled out: "4 sets of 5". */
  description: string;
  /** Grids to fill in: sets choose 2. */
  grids: number;
  /** Difficulty word for the shape. */
  blurb: string;
}

export interface Puzzle {
  /** Seed the puzzle was generated from — regenerating with it is deterministic. */
  seed: number;
  themeId: string;
  themeName: string;
  themeEmoji: string;
  accent: string;
  size: SizeOption;
  categories: PuzzleCategory[];
  /** solution[category][entity] = item index. */
  solution: number[][];
  clues: Clue[];
}
