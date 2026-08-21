/**
 * Puzzle themes. Each theme needs:
 *  - an anchor category first (the "who" of the puzzle),
 *  - at least one ordered category so comparison clues can be generated,
 *  - at least six items per category, which is the largest supported grid.
 *
 * `pattern` is the sentence fragment used in clues; `{}` becomes the item label.
 */
import type { ThemeDef } from '../puzzle/types';

const years = (start: number, step: number, count: number, suffix = '') =>
  Array.from({ length: count }, (_, index) => {
    const value = start + index * step;
    return { label: `${value}${suffix}`, value };
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
        items: ['Nova', 'Rhea', 'Iris', 'Milo', 'Vega', 'Juno'].map((label) => ({ label })),
      },
      {
        id: 'destination',
        name: 'Destination',
        pattern: 'the {} mission',
        items: ['Mars', 'Venus', 'Titan', 'Europa', 'Ceres', 'Io'].map((label) => ({ label })),
      },
      {
        id: 'ship',
        name: 'Ship',
        pattern: 'the {}',
        items: ['Kestrel', 'Corvus', 'Lyra', 'Orion', 'Pallas', 'Sable'].map((label) => ({ label })),
      },
      {
        id: 'cargo',
        name: 'Cargo',
        pattern: 'the {} payload',
        items: ['Seed Vault', 'Ice Core', 'Solar Sail', 'Rover Kit', 'Med Pods', 'Star Maps'].map(
          (label) => ({ label }),
        ),
      },
      {
        id: 'launch',
        name: 'Launch',
        pattern: 'the {} launch',
        items: years(2031, 1, 6),
        ordered: { noun: 'launch year', unit: 'years', greater: 'later', lesser: 'earlier' },
      },
    ],
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
        items: ['Alma', 'Basil', 'Dax', 'Esme', 'Fen', 'Grier'].map((label) => ({ label })),
      },
      {
        id: 'drink',
        name: 'Drink',
        pattern: 'the {} drinker',
        items: ['Latte', 'Mocha', 'Chai', 'Cortado', 'Matcha', 'Espresso'].map((label) => ({
          label,
        })),
      },
      {
        id: 'pastry',
        name: 'Pastry',
        pattern: 'whoever ordered the {}',
        items: ['Croissant', 'Cannelé', 'Scone', 'Éclair', 'Brioche', 'Tartlet'].map((label) => ({
          label,
        })),
      },
      {
        id: 'seat',
        name: 'Seat',
        pattern: 'the {} table',
        items: ['Window', 'Corner', 'Patio', 'Counter', 'Loft', 'Fireside'].map((label) => ({
          label,
        })),
      },
      {
        id: 'bill',
        name: 'Bill',
        pattern: 'the {} bill',
        items: years(4, 1, 6, '').map(({ label, value }) => ({ label: `$${label}`, value })),
        ordered: { noun: 'bill', unit: 'dollars', greater: 'higher', lesser: 'lower' },
      },
    ],
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
        items: ['Bran', 'Sorrel', 'Ivo', 'Wren', 'Tamsin', 'Kell'].map((label) => ({ label })),
      },
      {
        id: 'weapon',
        name: 'Weapon',
        pattern: 'the {} wielder',
        items: ['Ash Bow', 'Rune Axe', 'Gale Spear', 'Ember Blade', 'Frost Flail', 'Thorn Whip'].map(
          (label) => ({ label }),
        ),
      },
      {
        id: 'beast',
        name: 'Beast',
        pattern: 'the {} slayer',
        items: ['Griffin', 'Wyvern', 'Basilisk', 'Kraken', 'Chimera', 'Sphinx'].map((label) => ({
          label,
        })),
      },
      {
        id: 'realm',
        name: 'Realm',
        pattern: 'the champion of {}',
        items: ['Ashfell', 'Duskmoor', 'Highmere', 'Ironvale', 'Sablewood', 'Windreach'].map(
          (label) => ({ label }),
        ),
      },
      {
        id: 'reward',
        name: 'Reward',
        pattern: 'the {} reward',
        items: years(30, 15, 6).map(({ label, value }) => ({ label: `${label}g`, value })),
        ordered: { noun: 'reward', unit: 'gold', greater: 'larger', lesser: 'smaller' },
      },
    ],
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
        items: ['Pia', 'Rune', 'Sena', 'Tobin', 'Ada', 'Nico'].map((label) => ({ label })),
      },
      {
        id: 'species',
        name: 'Sighting',
        pattern: 'the {} spotter',
        items: ['Octopus', 'Manta', 'Turtle', 'Seahorse', 'Moray', 'Clownfish'].map((label) => ({
          label,
        })),
      },
      {
        id: 'gear',
        name: 'Gear',
        pattern: 'the diver with the {}',
        items: ['Red Fins', 'Blue Mask', 'Green Tank', 'Yellow Torch', 'Black Camera', 'White Slate'].map(
          (label) => ({ label }),
        ),
      },
      {
        id: 'site',
        name: 'Site',
        pattern: 'the {} site',
        items: ['Blue Hole', 'Lace Wall', 'Shipwreck', 'Kelp Maze', 'Coral Arch', 'Night Cove'].map(
          (label) => ({ label }),
        ),
      },
      {
        id: 'depth',
        name: 'Depth',
        pattern: 'the {} dive',
        items: years(12, 6, 6).map(({ label, value }) => ({ label: `${label}m`, value })),
        ordered: { noun: 'depth', unit: 'metres', greater: 'deeper', lesser: 'shallower' },
      },
    ],
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
        items: ['Opal', 'Ferris', 'Hazel', 'Lark', 'Pim', 'Rosa'].map((label) => ({ label })),
      },
      {
        id: 'flower',
        name: 'Flower',
        pattern: 'the {} grower',
        items: ['Dahlia', 'Peony', 'Iris', 'Tulip', 'Aster', 'Zinnia'].map((label) => ({ label })),
      },
      {
        id: 'pot',
        name: 'Pot',
        pattern: 'the {} pot',
        items: ['Terracotta', 'Cobalt', 'Ivory', 'Copper', 'Slate', 'Mint'].map((label) => ({
          label,
        })),
      },
      {
        id: 'tool',
        name: 'Tool',
        pattern: 'the {} owner',
        items: ['Trowel', 'Shears', 'Dibber', 'Rake', 'Sprayer', 'Gloves'].map((label) => ({
          label,
        })),
      },
      {
        id: 'height',
        name: 'Height',
        pattern: 'the {} plant',
        items: years(20, 15, 6).map(({ label, value }) => ({ label: `${label}cm`, value })),
        ordered: { noun: 'plant height', unit: 'centimetres', greater: 'taller', lesser: 'shorter' },
      },
    ],
  },
];

export function themeById(id: string): ThemeDef {
  const theme = THEMES.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}
