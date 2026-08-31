/**
 * Which drawing belongs to which item.
 *
 * Keyed the way the app keys them: theme, then category, then the item's **id**
 * — never its label, which is language and can be rewritten or translated
 * without the picture moving. `src/data/themes.ts` holds the ids and this holds
 * their pictures; a test checks the two agree, so an item added here and not
 * there (or the other way round) fails loudly rather than quietly leaving a
 * blank square on the board.
 */
import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

import { DRINKS, PASTRIES, SEATS, THEME_MARK as CAFE_MARK } from './cafe.mjs';
import { CARGO, DESTINATIONS, SHIPS, THEME_MARK as COSMIC_MARK } from './cosmic.mjs';
import { FLOWERS, POTS, THEME_MARK as GARDEN_MARK, TOOLS } from './garden.mjs';
import { person } from './people.mjs';
import { BEASTS, REALMS, THEME_MARK as QUEST_MARK, WEAPONS } from './quest.mjs';
import { GEAR, SITES, SPECIES, THEME_MARK as REEF_MARK } from './reef.mjs';
import { BILLS, DEPTHS, HEIGHTS, LAUNCHES, MARKS, REWARDS, UI } from './scales.mjs';

/** The words the app ships with, which the people are drawn from. */
const LOCALE = parse(readFileSync(new URL('../../locales/en-HB.yaml', import.meta.url), 'utf8'));

/**
 * Everybody in one theme's anchor set, drawn from what the reference locale
 * says about them.
 *
 * The hair and the distinguishing feature on a person's card are the two things
 * their picture shows, so the picture is built from the card rather than beside
 * it: rewrite somebody's hair in the language file and the next `npm run icons`
 * redraws them to match. There is no second list to keep in step, and no way to
 * end up with a card describing a ponytail over a drawing of a shaved head.
 */
function cast(themeId, categoryId) {
  const items = LOCALE.themes[themeId].categories[categoryId].items;
  return Object.fromEntries(
    Object.entries(items).map(([id, said]) => [
      id,
      person(themeId, said.traits.hair, said.traits.feature),
    ]),
  );
}

/**
 * The ids of each ordered category's rungs, in the order the theme lists them.
 * Ids rather than labels, like every other key here — a bill's id is `4` where
 * the player reads `$4`.
 */
const years = Array.from({ length: 14 }, (_, index) => `${2031 + index}`);
const dollars = Array.from({ length: 14 }, (_, index) => `${4 + index}`);
const gold = Array.from({ length: 14 }, (_, index) => `${30 + index * 15}g`);
const metres = Array.from({ length: 14 }, (_, index) => `${10 + index * 5}m`);
const centimetres = Array.from({ length: 14 }, (_, index) => `${20 + index * 15}cm`);

export const REGISTRY = {
  cosmic: {
    astronaut: cast('cosmic', 'astronaut'),
    destination: DESTINATIONS,
    ship: SHIPS,
    cargo: CARGO,
    launch: LAUNCHES(years),
    theme: { Theme: COSMIC_MARK },
  },
  cafe: {
    customer: cast('cafe', 'customer'),
    drink: DRINKS,
    pastry: PASTRIES,
    seat: SEATS,
    bill: BILLS(dollars),
    theme: { Theme: CAFE_MARK },
  },
  quest: {
    hero: cast('quest', 'hero'),
    weapon: WEAPONS,
    beast: BEASTS,
    realm: REALMS,
    reward: REWARDS(gold),
    theme: { Theme: QUEST_MARK },
  },
  reef: {
    diver: cast('reef', 'diver'),
    species: SPECIES,
    gear: GEAR,
    site: SITES,
    depth: DEPTHS(metres),
    theme: { Theme: REEF_MARK },
  },
  garden: {
    gardener: cast('garden', 'gardener'),
    flower: FLOWERS,
    pot: POTS,
    tool: TOOLS,
    height: HEIGHTS(centimetres),
    theme: { Theme: GARDEN_MARK },
  },
  // Not a theme: the pictures the app itself draws with — the three on its
  // buttons, and the four marks the board takes.
  ui: {
    icon: { clue: UI.clue, chart: UI.chart, back: UI.back },
    mark: {
      'tick-hand': MARKS.tickHand,
      'tick-auto': MARKS.tickAuto,
      'cross-hand': MARKS.crossHand,
      'cross-auto': MARKS.crossAuto,
    },
  },
};
