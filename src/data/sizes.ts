import { t } from '../i18n';
import type { SizeOption } from '../puzzle/types';

/**
 * `items` is the number of rows per grid, `categories` how many columns of grids.
 *
 * The ladder climbs one at a time: another set to keep track of, until there
 * are five, and then one set is given back to buy another entity to place. A
 * step that added both at once would double the board rather than stretch it,
 * which is how a difficulty ends up feeling like a different game instead of
 * the next one — and a set costs more than an entity, since every set pairs
 * with every other one, so trading one for the other still grows the board.
 */
export const SIZES: SizeOption[] = [
  {
    id: 'xs',
    items: 3,
    categories: 3,
    label: t('sizes.xs.label'),
    difficulty: t('sizes.xs.difficulty'),
    // Plain matches, groups and either-ors only. A beginner's board asks the
    // player to put things together; working from what a sentence rules out,
    // or from an order held in the head, is what the next rungs are for.
    clues: ['link', 'groupNot', 'either'],
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
    items: 3,
    categories: 5,
    label: t('sizes.md.label'),
    difficulty: t('sizes.md.difficulty'),
  },
  {
    id: 'lg',
    items: 4,
    categories: 4,
    label: t('sizes.lg.label'),
    difficulty: t('sizes.lg.difficulty'),
  },
  {
    id: 'xl',
    items: 4,
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
