import { t } from '../i18n';
import type { SizeOption } from '../puzzle/types';

/**
 * `items` is the number of rows per grid, `categories` how many columns of grids.
 *
 * The ladder climbs one at a time, and never both ways at once: a step that
 * added a set and an entity together would double the board rather than
 * stretch it, which is how a difficulty ends up feeling like a different game
 * instead of the next one.
 *
 * Sets stop at four and the entities carry the rest of the climb. A set costs
 * more than an entity — every set pairs with every other one, so a fifth set
 * would add as much again as the fourth did — and past four there is more board
 * than a phone has room for. Another row is the gentler way to make a puzzle
 * harder, and it is the one the top of the ladder uses.
 *
 * clues: ['link', 'notLink', 'groupNot', 'either', 'compare', 'compareGap']
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
    clues: ['link', 'either'],
  },
  {
    id: 'sm',
    items: 4,
    categories: 3,
    label: t('sizes.sm.label'),
    difficulty: t('sizes.sm.difficulty'),
    clues: ['link', 'groupNot', 'compare'],
  },
  {
    id: 'md',
    items: 4,
    categories: 4,
    label: t('sizes.md.label'),
    difficulty: t('sizes.md.difficulty'),
    clues: ['link', 'notLink', 'groupNot', 'either', 'compare'],
  },
  {
    id: 'lg',
    items: 5,
    categories: 4,
    label: t('sizes.lg.label'),
    difficulty: t('sizes.lg.difficulty'),
  },
  {
    id: 'xl',
    items: 6,
    categories: 4,
    label: t('sizes.xl.label'),
    difficulty: t('sizes.xl.difficulty'),
  },
];

export function sizeById(id: string): SizeOption {
  const size = SIZES.find((candidate) => candidate.id === id);
  if (!size) throw new Error(`Unknown size: ${id}`);
  return size;
}
