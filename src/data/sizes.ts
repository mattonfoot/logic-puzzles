import { t } from '../i18n';
import type { SizeOption } from '../puzzle/types';

/** `items` is the number of rows per grid, `categories` how many columns of grids. */
export const SIZES: SizeOption[] = [
  {
    id: 'xs',
    items: 3,
    categories: 3,
    label: t('sizes.xs.label'),
    difficulty: t('sizes.xs.difficulty'),
  },
  {
    id: 'sm',
    items: 4,
    categories: 4,
    label: t('sizes.sm.label'),
    difficulty: t('sizes.sm.difficulty'),
  },
  {
    id: 'md',
    items: 5,
    categories: 4,
    label: t('sizes.md.label'),
    difficulty: t('sizes.md.difficulty'),
  },
  {
    id: 'lg',
    items: 6,
    categories: 4,
    label: t('sizes.lg.label'),
    difficulty: t('sizes.lg.difficulty'),
  },
];

export function sizeById(id: string): SizeOption {
  const size = SIZES.find((candidate) => candidate.id === id);
  if (!size) throw new Error(`Unknown size: ${id}`);
  return size;
}
