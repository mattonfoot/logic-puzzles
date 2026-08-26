import type { SizeOption } from '../puzzle/types';

/** `items` is the number of rows per grid, `categories` how many columns of grids. */
export const SIZES: SizeOption[] = [
  { id: 'xs', items: 3, categories: 3, label: '3 × 3', difficulty: 'Beginner' },
  { id: 'sm', items: 4, categories: 4, label: '4 × 4', difficulty: 'Advanced' },
  { id: 'md', items: 5, categories: 4, label: '5 × 4', difficulty: 'Expert' },
  { id: 'lg', items: 6, categories: 4, label: '6 × 4', difficulty: 'Pro' },
];

export function sizeById(id: string): SizeOption {
  const size = SIZES.find((candidate) => candidate.id === id);
  if (!size) throw new Error(`Unknown size: ${id}`);
  return size;
}
