/**
 * Which drawing belongs to which item.
 *
 * Keyed the way the app keys them: theme, then category, then the item's label.
 * `src/data/themes.ts` holds the labels and this holds their pictures; a test
 * checks the two agree, so a renamed item fails loudly rather than quietly
 * losing its icon.
 */
import { DRINKS, PASTRIES, SEATS, THEME_MARK as CAFE_MARK } from './cafe.mjs';
import { CARGO, DESTINATIONS, SHIPS, THEME_MARK as COSMIC_MARK } from './cosmic.mjs';
import { FLOWERS, POTS, THEME_MARK as GARDEN_MARK, TOOLS } from './garden.mjs';
import { person } from './people.mjs';
import { BEASTS, REALMS, THEME_MARK as QUEST_MARK, WEAPONS } from './quest.mjs';
import { GEAR, SITES, SPECIES, THEME_MARK as REEF_MARK } from './reef.mjs';
import { BILLS, DEPTHS, HEIGHTS, LAUNCHES, MARKS, REWARDS, UI } from './scales.mjs';

/** The rungs of each ordered category, in the order the theme lists them. */
const years = Array.from({ length: 14 }, (_, index) => `${2031 + index}`);
const dollars = Array.from({ length: 14 }, (_, index) => `$${4 + index}`);
const gold = Array.from({ length: 14 }, (_, index) => `${30 + index * 15}g`);
const metres = Array.from({ length: 14 }, (_, index) => `${10 + index * 5}m`);
const centimetres = Array.from({ length: 14 }, (_, index) => `${20 + index * 15}cm`);

export const REGISTRY = {
  cosmic: {
    astronaut: {
      Nova: person('cosmic', 'ponytail'),
      Rhea: person('cosmic', 'bun'),
      Iris: person('cosmic', 'curls'),
      Milo: person('cosmic', 'crop'),
      Vega: person('cosmic', 'mohawk'),
      Juno: person('cosmic', 'bob'),
      Orin: person('cosmic', 'bald'),
      Cass: person('cosmic', 'beard'),
      Elio: person('cosmic', 'short'),
      Suri: person('cosmic', 'braids'),
      Dax: person('cosmic', 'cap'),
      Noor: person('cosmic', 'scarf'),
      Kai: person('cosmic', 'visor'),
      Wren: person('cosmic', 'long'),
    },
    destination: DESTINATIONS,
    ship: SHIPS,
    cargo: CARGO,
    launch: LAUNCHES(years),
    theme: { Theme: COSMIC_MARK },
  },
  cafe: {
    customer: {
      Alma: person('cafe', 'bun'),
      Basil: person('cafe', 'beard'),
      Dax: person('cafe', 'cap'),
      Esme: person('cafe', 'ponytail'),
      Fen: person('cafe', 'curls'),
      Grier: person('cafe', 'brim'),
      Hollis: person('cafe', 'short'),
      Ines: person('cafe', 'bob'),
      Jonas: person('cafe', 'crop'),
      Kit: person('cafe', 'mohawk'),
      Lena: person('cafe', 'long'),
      Mika: person('cafe', 'topknot'),
      Nell: person('cafe', 'scarf'),
      Otto: person('cafe', 'bald'),
    },
    drink: DRINKS,
    pastry: PASTRIES,
    seat: SEATS,
    bill: BILLS(dollars),
    theme: { Theme: CAFE_MARK },
  },
  quest: {
    hero: {
      Bran: person('quest', 'beard'),
      Sorrel: person('quest', 'ponytail'),
      Ivo: person('quest', 'bald'),
      Wren: person('quest', 'braids'),
      Tamsin: person('quest', 'long'),
      Kell: person('quest', 'crop'),
      Rowan: person('quest', 'curls'),
      Fenn: person('quest', 'short'),
      Maeve: person('quest', 'bun'),
      Osric: person('quest', 'hood'),
      Perrin: person('quest', 'bob'),
      Isolde: person('quest', 'topknot'),
      Garrick: person('quest', 'scarf'),
      Nyla: person('quest', 'mohawk'),
    },
    weapon: WEAPONS,
    beast: BEASTS,
    realm: REALMS,
    reward: REWARDS(gold),
    theme: { Theme: QUEST_MARK },
  },
  reef: {
    diver: {
      Pia: person('reef', 'ponytail'),
      Rune: person('reef', 'beard'),
      Sena: person('reef', 'braids'),
      Tobin: person('reef', 'crop'),
      Ada: person('reef', 'bun'),
      Nico: person('reef', 'short'),
      Marlow: person('reef', 'brim'),
      Indra: person('reef', 'curls'),
      Cleo: person('reef', 'bob'),
      Bo: person('reef', 'mohawk'),
      Yara: person('reef', 'long'),
      Elias: person('reef', 'visor'),
      Suki: person('reef', 'topknot'),
      Rafa: person('reef', 'bald'),
    },
    species: SPECIES,
    gear: GEAR,
    site: SITES,
    depth: DEPTHS(metres),
    theme: { Theme: REEF_MARK },
  },
  garden: {
    gardener: {
      Opal: person('garden', 'bun'),
      Ferris: person('garden', 'beard'),
      Hazel: person('garden', 'ponytail'),
      Lark: person('garden', 'short'),
      Pim: person('garden', 'brim'),
      Rosa: person('garden', 'curls'),
      Bram: person('garden', 'bald'),
      Tilly: person('garden', 'braids'),
      Emrys: person('garden', 'crop'),
      Wilder: person('garden', 'mohawk'),
      Junie: person('garden', 'bob'),
      Alder: person('garden', 'hood'),
      Posy: person('garden', 'scarf'),
      Marnie: person('garden', 'long'),
    },
    flower: FLOWERS,
    pot: POTS,
    tool: TOOLS,
    height: HEIGHTS(centimetres),
    theme: { Theme: GARDEN_MARK },
  },
  // Not a theme: the pictures the app itself draws with — the three on its
  // buttons, and the four marks the board takes.
  ui: {
    icon: { Clue: UI.clue, Chart: UI.chart, Back: UI.back },
    mark: {
      'Tick hand': MARKS.tickHand,
      'Tick auto': MARKS.tickAuto,
      'Cross hand': MARKS.crossHand,
      'Cross auto': MARKS.crossAuto,
    },
  },
};
