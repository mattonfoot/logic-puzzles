/**
 * The puzzle themes: which sets a theme plays with, which items are in them and
 * in what order, and the numbers behind the ordered ones.
 *
 * **The words are not here.** Every name, description, blurb and trait value is
 * in `locales/en-HB.yaml` under `themes.<theme>.categories.<set>`, and this file
 * is the skeleton they hang on: ids, ordering and arithmetic. An item is known
 * by its id — `nova`, `seed-vault` — which is what the file name of its drawing
 * is built from, so translating an item's label cannot break its picture.
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

/** A plain set: its items in the order given, with the words the file supplies. */
function set(themeId: string, id: string, itemIds: readonly string[]): CategoryDef {
  const words = wordsFor(themeId, id);
  return {
    id,
    name: words.name,
    pattern: words.pattern,
    describes: words.describes,
    noun: words.noun,
    traits: traitsOf(words),
    items: itemIds.map((itemId) => itemOf(words, itemId)),
  };
}

/**
 * An ordered set: a plain one plus the numbers its items compare by. The
 * numbers are arithmetic and stay here; how they are written — "2031", "$5",
 * "40m" — is a label like any other and lives in the language file.
 */
function scale(
  themeId: string,
  id: string,
  itemIds: readonly string[],
  values: readonly number[],
): CategoryDef {
  const words = wordsFor(themeId, id);
  if (!words.ordered) throw new Error(`${themeId}.${id} has no ordered wording`);
  return {
    id,
    name: words.name,
    pattern: words.pattern,
    describes: words.describes,
    noun: words.noun,
    traits: traitsOf(words),
    items: itemIds.map((itemId, index) => itemOf(words, itemId, values[index])),
    ordered: words.ordered,
  };
}

/** A theme: its own words, and the sets it plays with. */
function theme(id: string, categories: CategoryDef[]): ThemeDef {
  const said = SAID[id];
  return {
    id,
    name: said.name,
    icon: '',
    blurb: said.blurb,
    categories,
    ...(said.clues ? { clues: { ...said.clues } } : null),
  };
}

export const THEMES: ThemeDef[] = withIcons([
  theme('cosmic', [
    set('cosmic', 'astronaut', [
      'zarg',
      'vilenkov',
      'rodgers',
      'halloway',
      'okonkwo',
      'bolt',
      'vex',
      'quill',
      'tumble',
      'strand',
      'ondra',
      'fizz',
      'bex',
      'mo',
    ]),
    set('cosmic', 'destination', [
      'mars',
      'venus',
      'titan',
      'europa',
      'ceres',
      'io',
      'luna',
      'vesta',
      'callisto',
      'ganymede',
      'enceladus',
      'triton',
      'phobos',
      'deimos',
    ]),
    set('cosmic', 'ship', [
      'kestrel',
      'corvus',
      'lyra',
      'orion',
      'pallas',
      'sable',
      'merlin',
      'halcyon',
      'vesper',
      'nimbus',
      'aurora',
      'cygnus',
      'perseus',
      'zephyr',
    ]),
    set('cosmic', 'cargo', [
      'seed-vault',
      'ice-core',
      'solar-sail',
      'rover-kit',
      'med-pods',
      'star-maps',
      'water-tank',
      'drone-bay',
      'soil-lab',
      'fuel-cells',
      'greenhouse',
      'repair-kit',
      'comms-mast',
      'sample-case',
    ]),
    scale(
      'cosmic',
      'launch',
      [
        '2031',
        '2032',
        '2033',
        '2034',
        '2035',
        '2036',
        '2037',
        '2038',
        '2039',
        '2040',
        '2041',
        '2042',
        '2043',
        '2044',
      ],
      [2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044],
    ),
  ]),
  theme('cafe', [
    set('cafe', 'customer', [
      'barley',
      'crumb',
      'marzipan',
      'frangi',
      'bap',
      'crumpet',
      'bloomer',
      'custard',
      'sourdough',
      'filo',
      'nutmeg',
      'praline',
      'battenberg',
      'tuille',
    ]),
    set('cafe', 'drink', [
      'latte',
      'mocha',
      'chai',
      'cortado',
      'matcha',
      'espresso',
      'flat-white',
      'americano',
      'cappuccino',
      'macchiato',
      'cold-brew',
      'oat-latte',
      'mint-tea',
      'hot-choc',
    ]),
    set('cafe', 'pastry', [
      'croissant',
      'cannel',
      'scone',
      'clair',
      'brioche',
      'tartlet',
      'danish',
      'madeleine',
      'palmier',
      'doughnut',
      'muffin',
      'baklava',
      'cruffin',
      'turnover',
    ]),
    set('cafe', 'seat', [
      'window',
      'corner',
      'patio',
      'counter',
      'loft',
      'fireside',
      'balcony',
      'alcove',
      'bar-stool',
      'booth',
      'terrace',
      'garden',
      'nook',
      'bench',
    ]),
    scale(
      'cafe',
      'bill',
      ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    ),
  ]),
  theme('quest', [
    set('quest', 'hero', [
      'brannoch',
      'sorrel',
      'ivo',
      'wren',
      'tamsin',
      'kell',
      'rowan',
      'fenn',
      'maeve',
      'osric',
      'perrin',
      'isolde',
      'garrick',
      'nyla',
    ]),
    set('quest', 'weapon', [
      'ash-bow',
      'rune-axe',
      'gale-spear',
      'ember-blade',
      'frost-flail',
      'thorn-whip',
      'storm-mace',
      'moon-dagger',
      'oak-staff',
      'bone-sling',
      'star-lance',
      'wind-sabre',
      'shadow-pike',
      'iron-halberd',
    ]),
    set('quest', 'beast', [
      'griffin',
      'wyvern',
      'basilisk',
      'kraken',
      'chimera',
      'sphinx',
      'manticore',
      'hydra',
      'cyclops',
      'banshee',
      'golem',
      'harpy',
      'minotaur',
      'direwolf',
    ]),
    set('quest', 'realm', [
      'ashfell',
      'duskmoor',
      'highmere',
      'ironvale',
      'sablewood',
      'windreach',
      'thornhold',
      'greymarch',
      'frostgate',
      'emberholt',
      'larkspur',
      'mistvale',
      'stonebrook',
      'ravenfen',
    ]),
    scale(
      'quest',
      'reward',
      [
        '30g',
        '45g',
        '60g',
        '75g',
        '90g',
        '105g',
        '120g',
        '135g',
        '150g',
        '165g',
        '180g',
        '195g',
        '210g',
        '225g',
      ],
      [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225],
    ),
  ]),
  theme('reef', [
    set('reef', 'diver', [
      'shoal',
      'pike',
      'ferrand',
      'tobin',
      'adaeze',
      'nico',
      'marlow',
      'indra',
      'cleo',
      'bo',
      'yara',
      'elias',
      'suki',
      'rafa',
    ]),
    set('reef', 'species', [
      'octopus',
      'manta',
      'turtle',
      'seahorse',
      'moray',
      'clownfish',
      'barracuda',
      'stingray',
      'lionfish',
      'grouper',
      'pipefish',
      'reef-shark',
      'cuttlefish',
      'sea-urchin',
    ]),
    set('reef', 'gear', [
      'red-fins',
      'blue-mask',
      'green-tank',
      'yellow-torch',
      'black-camera',
      'white-slate',
      'orange-reel',
      'pink-buoy',
      'silver-knife',
      'teal-compass',
      'grey-gloves',
      'amber-lamp',
      'coral-flag',
      'navy-hood',
    ]),
    set('reef', 'site', [
      'blue-hole',
      'lace-wall',
      'shipwreck',
      'kelp-maze',
      'coral-arch',
      'night-cove',
      'tide-pools',
      'anchor-bay',
      'sea-fan-bay',
      'lantern-reef',
      'sunken-pier',
      'green-lagoon',
      'cavern-ridge',
      'turtle-point',
    ]),
    scale(
      'reef',
      'depth',
      [
        '10m',
        '15m',
        '20m',
        '25m',
        '30m',
        '35m',
        '40m',
        '45m',
        '50m',
        '55m',
        '60m',
        '65m',
        '70m',
        '75m',
      ],
      [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75],
    ),
  ]),
  theme('garden', [
    set('garden', 'gardener', [
      'rose',
      'parsley',
      'mint',
      'petunia',
      'peapod',
      'mud',
      'thistle',
      'compost',
      'bramble',
      'nettle',
      'turnip',
      'fennel',
      'spade',
      'marrow',
    ]),
    set('garden', 'flower', [
      'dahlia',
      'peony',
      'iris',
      'tulip',
      'aster',
      'zinnia',
      'lupin',
      'freesia',
      'marigold',
      'foxglove',
      'camellia',
      'sweet-pea',
      'snapdragon',
      'cosmos',
    ]),
    set('garden', 'pot', [
      'terracotta',
      'cobalt',
      'ivory',
      'copper',
      'slate',
      'mint',
      'rust',
      'cream',
      'indigo',
      'charcoal',
      'blush',
      'amber',
      'olive',
      'plum',
    ]),
    set('garden', 'tool', [
      'trowel',
      'shears',
      'dibber',
      'rake',
      'sprayer',
      'gloves',
      'hoe',
      'twine',
      'secateurs',
      'kneeler',
      'sieve',
      'hand-fork',
      'watering-can',
      'plant-labels',
    ]),
    scale(
      'garden',
      'height',
      [
        '20cm',
        '35cm',
        '50cm',
        '65cm',
        '80cm',
        '95cm',
        '110cm',
        '125cm',
        '140cm',
        '155cm',
        '170cm',
        '185cm',
        '200cm',
        '215cm',
      ],
      [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215],
    ),
  ]),
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
