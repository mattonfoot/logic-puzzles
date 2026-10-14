/**
 * The puzzle themes, built from the language file.
 *
 * **Almost nothing is here.** Which sets a theme plays with, which items are in
 * them and in what order, and every name, description, blurb and trait value,
 * are in `locales/en-GB.yaml` under `themes.<theme>.categories.<set>`. This file
 * is the list of themes and the arithmetic: the numbers an ordered set's items
 * compare by. An item is known by its id — `nova`, `seed-vault` — which is what
 * the file name of its drawing is built from, so translating an item's label
 * cannot break its picture.
 *
 * A theme still needs an anchor category first (the "who" of the puzzle), at
 * least one ordered category so comparison clues can be generated, and a deep
 * pool per set: the generator samples a fresh handful every time, so the same
 * theme rarely produces the same cast twice.
 *
 * Traits are what let a clue describe something instead of naming it — "the
 * astronaut with red hair", "no payload made of glass". Which traits a set has,
 * and every item's value for them, are both in the language file, since both
 * are words.
 */
import { STRINGS } from '../i18n';
import type { CategoryDef, ItemDef, OrderedMeta, ThemeDef, TraitDef } from '../puzzle/types';

interface CategoryWords {
  name: string;
  pattern: string;
  describes: string;
  noun: string;
  ordered?: OrderedMeta;
  traits: Record<string, { label: string; pattern: string }>;
  items: Record<string, { label: string; blurb: string; traits?: Record<string, string> }>;
}

interface ThemeWords {
  name: string;
  blurb: string;
  clues?: Record<string, string>;
  categories: Record<string, CategoryWords>;
}

const SAID = STRINGS.themes as unknown as Record<string, ThemeWords>;

/** What the language file says about one set. */
function wordsFor(themeId: string, categoryId: string): CategoryWords {
  const category = SAID[themeId]?.categories?.[categoryId];
  if (!category) throw new Error(`No words for ${themeId}.${categoryId}`);
  return category;
}

/** The set's traits, in the order the language file lists them. */
function traitsOf(words: CategoryWords): TraitDef[] {
  return Object.entries(words.traits).map(([id, trait]) => ({
    id,
    label: trait.label,
    pattern: trait.pattern,
  }));
}

function itemOf(words: CategoryWords, id: string, value?: number): ItemDef {
  const said = words.items[id];
  if (!said) throw new Error(`No words for item ${id}`);
  return {
    id,
    label: said.label,
    blurb: said.blurb,
    traits: { ...(said.traits ?? {}) },
    // Filled in by `withIcons`, from the theme, the category and this id.
    icon: '',
    ...(value === undefined ? null : { value }),
  };
}

/**
 * The numbers an ordered set's items compare by, one per item: `start`, and
 * then `step` more for each item after it. Every scale in the game climbs
 * evenly, which is what lets a clue say "two steps later" and mean one thing.
 */
const steps = (start: number, step: number) => (index: number) => start + step * index;

/**
 * A set, as the language file has it: its items in the order the file lists
 * them, and for an ordered set the numbers they compare by. The numbers are
 * arithmetic and stay here; how they are written — "2031", "£5", "40m" — is a
 * label like any other and lives in the language file. A scale whose items are
 * plain numbers is its own arithmetic and needs no `steps`.
 */
function set(themeId: string, id: string, scale?: (index: number) => number): CategoryDef {
  const words = wordsFor(themeId, id);
  // An object lists keys that read as whole numbers in ascending order, ahead
  // of the rest, whatever order they were written in. That is the order a
  // scale of plain numbers wants; a set that mixed the two would come out
  // shuffled, and none does.
  const itemIds = Object.keys(words.items);
  if (scale && !words.ordered) throw new Error(`${themeId}.${id} has numbers but is not ordered`);
  if (words.ordered && !scale && !itemIds.every(isWhole)) {
    throw new Error(`${themeId}.${id} is ordered, and needs its numbers`);
  }
  const valueOf = words.ordered
    ? (scale ?? ((index: number) => Number(itemIds[index])))
    : () => undefined;
  return {
    id,
    name: words.name,
    pattern: words.pattern,
    describes: words.describes,
    noun: words.noun,
    traits: traitsOf(words),
    items: itemIds.map((itemId, index) => itemOf(words, itemId, valueOf(index))),
    ...(words.ordered ? { ordered: words.ordered } : null),
  };
}

const isWhole = (id: string) => /^\d+$/.test(id);

/**
 * A theme: its own words, and the sets it plays with, in the order the
 * language file lists them. `scales` gives the numbers for any ordered set
 * whose items are not plain numbers already.
 */
function theme(id: string, scales: Record<string, (index: number) => number> = {}): ThemeDef {
  const said = SAID[id];
  if (!said) throw new Error(`No words for theme ${id}`);
  return {
    id,
    name: said.name,
    icon: '',
    blurb: said.blurb,
    categories: Object.keys(said.categories).map((category) => set(id, category, scales[category])),
    ...(said.clues ? { clues: { ...said.clues } } : null),
  };
}

/**
 * Every theme, in the order the game offers them. The sets and their items come
 * from the language file; what is here is the order, and the arithmetic.
 */
export const THEMES: ThemeDef[] = withIcons([
  theme('cosmic'),
  theme('cafe'),
  theme('quest', { reward: steps(30, 15) }),
  theme('reef', { depth: steps(10, 5) }),
  theme('garden', { height: steps(20, 15) }),
  theme('museum'),
  theme('backstage-mystery'),
  theme('clockwork-workshop'),
  // Times of day, in minutes after midnight.
  theme('harbour-watch', { arrival: steps(4 * 60, 30) }),
  theme('lantern-festival', { showtime: steps(18 * 60, 15) }),
  theme('last-train', { departure: steps(6 * 60, 30) }),
  theme('cloudtop-academy'),
]);

/**
 * The name of an item's picture: "quest/beast-griffin".
 *
 * Built from ids rather than from what anything is called, so an item renamed —
 * or translated — keeps the drawing it always had. A test checks every one of
 * them exists.
 */
export function iconName(theme: string, category: string, itemId: string): string {
  return `${theme}/${category}-${itemId}`;
}

/** Hands every theme, category and item the drawing named after it. */
function withIcons(themes: ThemeDef[]): ThemeDef[] {
  for (const theme of themes) {
    theme.icon = `${theme.id}/theme`;
    for (const category of theme.categories) {
      for (const item of category.items) {
        item.icon = iconName(theme.id, category.id, item.id);
      }
    }
  }
  return themes;
}

export function themeById(id: string): ThemeDef {
  const found = THEMES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown theme: ${id}`);
  return found;
}
