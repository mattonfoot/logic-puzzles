import { t } from '../i18n';
import type { SizeOption } from '../puzzle/types';

/**
 * `items` is the number of rows per grid, `categories` how many columns of grids.
 *
 * The ladder climbs one at a time, and alternates which way it grows: another
 * set to keep track of, then another entity to place, then another set. A step
 * that added both at once would double the board rather than stretch it, which
 * is how a difficulty ends up feeling like a different game instead of the next
 * one.
 */
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
    items: 3,
    categories: 4,
    label: t('sizes.sm.label'),
    difficulty: t('sizes.sm.difficulty'),
  },
  {
    id: 'md',
    items: 4,
    categories: 4,
    label: t('sizes.md.label'),
    difficulty: t('sizes.md.difficulty'),
  },
  {
    id: 'lg',
    items: 4,
    categories: 5,
    label: t('sizes.lg.label'),
    difficulty: t('sizes.lg.difficulty'),
  },
  {
    id: 'xl',
    items: 5,
    categories: 5,
    label: t('sizes.xl.label'),
    difficulty: t('sizes.xl.difficulty'),
  },
];

export function sizeById(id: string): SizeOption {
  const size = SIZES.find((candidate) => candidate.id === id);
  if (!size) throw new Error(`Unknown size: ${id}`);
  return size;
}
