/**
 * Puzzle themes. Each theme needs:
 *  - an anchor category first (the "who" of the puzzle),
 *  - at least one ordered category so comparison clues can be generated,
 *  - a deep pool of items per category: the generator samples a fresh handful
 *    every time, so the same theme rarely produces the same cast twice.
 *
 * `pattern` is the sentence fragment used in clues; `{}` becomes the item label.
 * Keep labels short — they are written sideways above narrow grid columns.
 *
 * `clues` gives the theme its own voice: templates for the sentences its clues
 * are written in, filled from the slots documented on `ClueTemplates`. Anything
 * a theme leaves out falls back to the neutral wording in
 * `DEFAULT_CLUE_TEMPLATES`, so a new theme can ship with none of them.
 */
import type { ItemDef, ThemeDef } from '../puzzle/types';

const words = (...labels: string[]): ItemDef[] => labels.map((label) => ({ label }));

/** Evenly spaced numbers for the ordered categories. */
const numbers = (
  start: number,
  step: number,
  count: number,
  format: (value: number) => string,
): ItemDef[] =>
  Array.from({ length: count }, (_, index) => {
    const value = start + index * step;
    return { label: format(value), value };
  });

export const THEMES: ThemeDef[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Voyage',
    emoji: '🚀',
    blurb: 'Crews, ships and launch windows',
    accent: '#4C6FFF',
    categories: [
      {
        id: 'astronaut',
        name: 'Astronaut',
        pattern: '{}',
        // prettier-ignore
        items: words(
          'Nova', 'Rhea', 'Iris', 'Milo', 'Vega', 'Juno', 'Orin',
          'Cass', 'Elio', 'Suri', 'Dax', 'Noor', 'Kai', 'Wren',
        ),
      },
      {
        id: 'destination',
        name: 'Destination',
        pattern: 'the crew bound for {}',
        // prettier-ignore
        items: words(
          'Mars', 'Venus', 'Titan', 'Europa', 'Ceres', 'Io', 'Luna',
          'Vesta', 'Callisto', 'Ganymede', 'Enceladus', 'Triton', 'Phobos', 'Deimos',
        ),
      },
      {
        id: 'ship',
        name: 'Ship',
        pattern: 'the {}',
        // prettier-ignore
        items: words(
          'Kestrel', 'Corvus', 'Lyra', 'Orion', 'Pallas', 'Sable', 'Merlin',
          'Halcyon', 'Vesper', 'Nimbus', 'Aurora', 'Cygnus', 'Perseus', 'Zephyr',
        ),
      },
      {
        id: 'cargo',
        name: 'Cargo',
        pattern: 'the {} payload',
        // prettier-ignore
        items: words(
          'Seed Vault', 'Ice Core', 'Solar Sail', 'Rover Kit', 'Med Pods',
          'Star Maps', 'Water Tank', 'Drone Bay', 'Soil Lab', 'Fuel Cells',
          'Greenhouse', 'Repair Kit', 'Comms Mast', 'Sample Case',
        ),
      },
      {
        id: 'launch',
        name: 'Launch',
        pattern: 'the {} launch',
        items: numbers(2031, 1, 14, (value) => `${value}`),
        ordered: { noun: 'launch year', unit: 'years', greater: 'later', lesser: 'earlier' },
      },
    ],
    clues: {
      link: '{a} shares a mission with {b}.',
      notLink: '{a} does not share a mission with {b}.',
      either: '{a} shares a mission with either {b} or {c}.',
      compare: '{greater} launches {comparative} than {lesser}.',
      compareGap: '{greater} launches exactly {gap} {unit} {comparative} than {lesser}.',
    },
  },
  {
    id: 'cafe',
    name: 'Corner Café',
    emoji: '☕️',
    blurb: 'Regulars, orders and the morning rush',
    accent: '#C2703D',
    categories: [
      {
        id: 'customer',
        name: 'Customer',
        pattern: '{}',
        // prettier-ignore
        items: words(
          'Alma', 'Basil', 'Dax', 'Esme', 'Fen', 'Grier', 'Hollis',
          'Ines', 'Jonas', 'Kit', 'Lena', 'Mika', 'Nell', 'Otto',
        ),
      },
      {
        id: 'drink',
        name: 'Drink',
        pattern: 'the {} drinker',
        // prettier-ignore
        items: words(
          'Latte', 'Mocha', 'Chai', 'Cortado', 'Matcha', 'Espresso', 'Flat White',
          'Americano', 'Cappuccino', 'Macchiato', 'Cold Brew', 'Oat Latte', 'Mint Tea', 'Hot Choc',
        ),
      },
      {
        id: 'pastry',
        name: 'Pastry',
        pattern: 'the {}',
        // prettier-ignore
        items: words(
          'Croissant', 'Cannelé', 'Scone', 'Éclair', 'Brioche', 'Tartlet', 'Danish',
          'Madeleine', 'Palmier', 'Doughnut', 'Muffin', 'Baklava', 'Cruffin', 'Turnover',
        ),
      },
      {
        id: 'seat',
        name: 'Seat',
        pattern: 'the {} table',
        // prettier-ignore
        items: words(
          'Window', 'Corner', 'Patio', 'Counter', 'Loft', 'Fireside', 'Balcony',
          'Alcove', 'Bar Stool', 'Booth', 'Terrace', 'Garden', 'Nook', 'Bench',
        ),
      },
      {
        id: 'bill',
        name: 'Bill',
        pattern: 'the {} bill',
        items: numbers(4, 1, 14, (value) => `$${value}`),
        ordered: { noun: 'bill', unit: 'dollars', greater: 'higher', lesser: 'lower' },
      },
    ],
    clues: {
      link: '{a} is on the same ticket as {b}.',
      notLink: '{a} is not on the same ticket as {b}.',
      either: '{a} is on the same ticket as either {b} or {c}.',
      compare: 'The {noun} for {greater} came out {comparative} than for {lesser}.',
      compareGap:
        'The {noun} for {greater} came out exactly {gap} {unit} {comparative} than for {lesser}.',
    },
  },
  {
    id: 'quest',
    name: 'Mythic Quest',
    emoji: '🗡️',
    blurb: 'Heroes, beasts and hard-won gold',
    accent: '#7A5AF8',
    categories: [
      {
        id: 'hero',
        name: 'Hero',
        pattern: '{}',
        // prettier-ignore
        items: words(
          'Bran', 'Sorrel', 'Ivo', 'Wren', 'Tamsin', 'Kell', 'Rowan',
          'Fenn', 'Maeve', 'Osric', 'Perrin', 'Isolde', 'Garrick', 'Nyla',
        ),
      },
      {
        id: 'weapon',
        name: 'Weapon',
        pattern: 'the {} wielder',
        // prettier-ignore
        items: words(
          'Ash Bow', 'Rune Axe', 'Gale Spear', 'Ember Blade', 'Frost Flail',
          'Thorn Whip', 'Storm Mace', 'Moon Dagger', 'Oak Staff', 'Bone Sling',
          'Star Lance', 'Wind Sabre', 'Shadow Pike', 'Iron Halberd',
        ),
      },
      {
        id: 'beast',
        name: 'Beast',
        pattern: 'the {} slayer',
        // prettier-ignore
        items: words(
          'Griffin', 'Wyvern', 'Basilisk', 'Kraken', 'Chimera', 'Sphinx', 'Manticore',
          'Hydra', 'Cyclops', 'Banshee', 'Golem', 'Harpy', 'Minotaur', 'Direwolf',
        ),
      },
      {
        id: 'realm',
        name: 'Realm',
        pattern: 'the champion of {}',
        // prettier-ignore
        items: words(
          'Ashfell', 'Duskmoor', 'Highmere', 'Ironvale', 'Sablewood', 'Windreach',
          'Thornhold', 'Greymarch', 'Frostgate', 'Emberholt', 'Larkspur', 'Mistvale',
          'Stonebrook', 'Ravenfen',
        ),
      },
      {
        id: 'reward',
        name: 'Reward',
        pattern: 'the {} reward',
        items: numbers(30, 15, 14, (value) => `${value}g`),
        ordered: { noun: 'reward', unit: 'gold', greater: 'larger', lesser: 'smaller' },
      },
    ],
    clues: {
      link: '{a} is none other than {b}.',
      notLink: '{a} is not {b}.',
      either: '{a} is either {b} or {c}.',
      compare: '{greater} claimed a {comparative} {noun} than {lesser}.',
      compareGap: '{greater} claimed exactly {gap} {unit} more than {lesser}.',
    },
  },
  {
    id: 'reef',
    name: 'Reef Dive',
    emoji: '🐠',
    blurb: 'Divers, sightings and depth logs',
    accent: '#0EA5A4',
    categories: [
      {
        id: 'diver',
        name: 'Diver',
        pattern: '{}',
        // prettier-ignore
        items: words(
          'Pia', 'Rune', 'Sena', 'Tobin', 'Ada', 'Nico', 'Marlow',
          'Indra', 'Cleo', 'Bo', 'Yara', 'Elias', 'Suki', 'Rafa',
        ),
      },
      {
        id: 'species',
        name: 'Sighting',
        pattern: 'the {} spotter',
        // prettier-ignore
        items: words(
          'Octopus', 'Manta', 'Turtle', 'Seahorse', 'Moray', 'Clownfish', 'Barracuda',
          'Stingray', 'Lionfish', 'Grouper', 'Pipefish', 'Reef Shark', 'Cuttlefish', 'Sea Urchin',
        ),
      },
      {
        id: 'gear',
        name: 'Gear',
        pattern: 'the diver with the {}',
        // prettier-ignore
        items: words(
          'Red Fins', 'Blue Mask', 'Green Tank', 'Yellow Torch', 'Black Camera',
          'White Slate', 'Orange Reel', 'Pink Buoy', 'Silver Knife', 'Teal Compass',
          'Grey Gloves', 'Amber Lamp', 'Coral Flag', 'Navy Hood',
        ),
      },
      {
        id: 'site',
        name: 'Site',
        pattern: 'the {} site',
        // prettier-ignore
        items: words(
          'Blue Hole', 'Lace Wall', 'Shipwreck', 'Kelp Maze', 'Coral Arch', 'Night Cove',
          'Tide Pools', 'Anchor Bay', 'Sea Fan Bay', 'Lantern Reef', 'Sunken Pier',
          'Green Lagoon', 'Cavern Ridge', 'Turtle Point',
        ),
      },
      {
        id: 'depth',
        name: 'Depth',
        pattern: 'the diver at {}',
        items: numbers(12, 6, 14, (value) => `${value}m`),
        ordered: { noun: 'depth', unit: 'metres', greater: 'deeper', lesser: 'shallower' },
      },
    ],
    clues: {
      link: '{a} and {b} were on the same dive.',
      notLink: '{a} and {b} were not on the same dive.',
      either: '{a} was on the same dive as either {b} or {c}.',
      compare: '{greater} went {comparative} than {lesser}.',
      compareGap: '{greater} went exactly {gap} {unit} {comparative} than {lesser}.',
    },
  },
  {
    id: 'garden',
    name: 'Blue Ribbon Garden',
    emoji: '🌻',
    blurb: 'Growers, blooms and show-day heights',
    accent: '#2F8F4E',
    categories: [
      {
        id: 'gardener',
        name: 'Gardener',
        pattern: '{}',
        // prettier-ignore
        items: words(
          'Opal', 'Ferris', 'Hazel', 'Lark', 'Pim', 'Rosa', 'Bram',
          'Tilly', 'Emrys', 'Wilder', 'Junie', 'Alder', 'Posy', 'Marnie',
        ),
      },
      {
        id: 'flower',
        name: 'Flower',
        pattern: 'the {} grower',
        // prettier-ignore
        items: words(
          'Dahlia', 'Peony', 'Iris', 'Tulip', 'Aster', 'Zinnia', 'Lupin',
          'Freesia', 'Marigold', 'Foxglove', 'Camellia', 'Sweet Pea', 'Snapdragon', 'Cosmos',
        ),
      },
      {
        id: 'pot',
        name: 'Pot',
        pattern: 'the {} pot',
        // prettier-ignore
        items: words(
          'Terracotta', 'Cobalt', 'Ivory', 'Copper', 'Slate', 'Mint', 'Rust',
          'Cream', 'Indigo', 'Charcoal', 'Blush', 'Amber', 'Olive', 'Plum',
        ),
      },
      {
        id: 'tool',
        name: 'Tool',
        pattern: 'the {} owner',
        // prettier-ignore
        items: words(
          'Trowel', 'Shears', 'Dibber', 'Rake', 'Sprayer', 'Gloves', 'Hoe',
          'Twine', 'Secateurs', 'Kneeler', 'Sieve', 'Hand Fork', 'Watering Can', 'Plant Labels',
        ),
      },
      {
        id: 'height',
        name: 'Height',
        pattern: 'the {} plant',
        items: numbers(20, 15, 14, (value) => `${value}cm`),
        ordered: {
          noun: 'plant height',
          unit: 'centimetres',
          greater: 'taller',
          lesser: 'shorter',
        },
      },
    ],
    clues: {
      link: '{a} and {b} are the same entry.',
      notLink: '{a} and {b} are different entries.',
      either: '{a} is the same entry as either {b} or {c}.',
      compare: '{greater} stands {comparative} than {lesser}.',
      compareGap: '{greater} stands exactly {gap} {unit} {comparative} than {lesser}.',
    },
  },
];

export function themeById(id: string): ThemeDef {
  const theme = THEMES.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}
