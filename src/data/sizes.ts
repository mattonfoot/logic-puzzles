import type { SizeOption } from '../puzzle/types';

/**
 * A puzzle's shape is chosen on two dials: how many **sets** take part and how
 * many **items** each set holds. Every pair of sets gets its own grid, so three
 * sets make three grids, four make six and five make ten.
 *
 * The bounds come from the themes: each one supplies five sets of six items.
 */
export const SET_COUNTS = [3, 4, 5];
export const ITEM_COUNTS = [3, 4, 5, 6];

export const MIN_SETS = SET_COUNTS[0];
export const MAX_SETS = SET_COUNTS[SET_COUNTS.length - 1];
export const MIN_ITEMS = ITEM_COUNTS[0];
export const MAX_ITEMS = ITEM_COUNTS[ITEM_COUNTS.length - 1];

export const sizeId = (sets: number, items: number) => `${sets}x${items}`;

/** Grids to fill in: one per pair of sets. */
export const gridCount = (sets: number) => (sets * (sets - 1)) / 2;

/** Cells across every grid — a decent stand-in for how much work a shape is. */
export const cellCount = (sets: number, items: number) => gridCount(sets) * items * items;

function blurbFor(sets: number, items: number): string {
  const cells = cellCount(sets, items);
  if (cells < 50) return 'Warm-up';
  if (cells < 100) return 'Easy going';
  if (cells < 170) return 'Classic';
  if (cells < 260) return 'Tricky';
  return 'Expert';
}

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, Math.round(value)));

export function makeSize(sets: number, items: number): SizeOption {
  return {
    id: sizeId(sets, items),
    sets,
    items,
    label: `${sets} × ${items}`,
    description: `${sets} sets of ${items}`,
    grids: gridCount(sets),
    blurb: blurbFor(sets, items),
  };
}

/** Every shape the pickers offer, sets ascending then items ascending. */
export const SIZES: SizeOption[] = SET_COUNTS.flatMap((sets) =>
  ITEM_COUNTS.map((items) => makeSize(sets, items)),
);

export const DEFAULT_SIZE = makeSize(4, 4);

/** Snaps any pair of numbers to a supported shape. */
export function sizeFor(sets: number, items: number): SizeOption {
  return makeSize(clamp(sets, MIN_SETS, MAX_SETS), clamp(items, MIN_ITEMS, MAX_ITEMS));
}

/**
 * The four presets the app shipped with, before sets and items became separate
 * dials. Kept so saved games and statistics from those builds still line up.
 */
const LEGACY_SIZE_IDS: Record<string, string> = {
  xs: sizeId(3, 3),
  sm: sizeId(4, 4),
  md: sizeId(4, 5),
  lg: sizeId(4, 6),
};

export function normaliseSizeId(id: string): string {
  return LEGACY_SIZE_IDS[id] ?? id;
}

/** Parses an id back into a shape; `null` for anything unrecognisable. */
export function sizeFromId(id: string): SizeOption | null {
  const match = /^(\d+)x(\d+)$/.exec(normaliseSizeId(id));
  if (!match) return null;
  return makeSize(Number(match[1]), Number(match[2]));
}

export function sizeById(id: string): SizeOption {
  const size = sizeFromId(id);
  if (!size) throw new Error(`Unknown size: ${id}`);
  return size;
}
