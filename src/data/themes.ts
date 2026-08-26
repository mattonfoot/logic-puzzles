/**
 * Puzzle themes. Each theme needs:
 *  - an anchor category first (the "who" of the puzzle),
 *  - at least one ordered category so comparison clues can be generated,
 *  - a deep pool of items per category: the generator samples a fresh handful
 *    every time, so the same theme rarely produces the same cast twice.
 *
 * Every item carries three things beyond its name: an icon, a line about it for
 * the player who taps its label, and a value for each of its category's traits.
 * Traits are what let a clue describe something instead of naming it — "the
 * astronaut with red hair", "no payload made of glass" — so they are chosen to
 * read as English and to be worth knowing: a few values shared by several items
 * for the group clues, a few that pick out one.
 *
 * `pattern` is the sentence fragment used in clues; `{}` becomes the item label.
 * Keep labels short — they are written sideways above narrow grid columns.
 *
 * `clues` gives the theme its own voice: templates for the sentences its clues
 * are written in, filled from the slots documented on `ClueTemplates`. Anything
 * a theme leaves out falls back to the neutral wording in
 * `DEFAULT_CLUE_TEMPLATES`, so a new theme can ship with none of them.
 */
import type { CategoryDef, ItemDef, OrderedMeta, ThemeDef, TraitDef } from '../puzzle/types';

/**
 * One category, written as a table: every row is an item, in the order
 * `label, icon, …one value per trait…, blurb`. Reading the trait values off the
 * category's own list keeps the columns and the headings from drifting apart.
 */
function set(
  spec: {
    id: string;
    name: string;
    pattern: string;
    describes: string;
    noun: string;
    traits: TraitDef[];
  },
  rows: readonly (readonly string[])[],
): CategoryDef {
  const items = rows.map((row) => {
    if (row.length !== spec.traits.length + 3) {
      throw new Error(
        `${spec.id}: "${row[0]}" has ${row.length - 3} traits, not the expected ${spec.traits.length}`,
      );
    }
    const [label, icon, ...rest] = row;
    return {
      label,
      icon,
      blurb: rest[rest.length - 1],
      traits: Object.fromEntries(spec.traits.map((trait, index) => [trait.id, rest[index]])),
    };
  });
  return { ...spec, items };
}

/** Where a number sits on its scale, in thirds. */
const bandOf = (index: number, count: number, bands: [string, string, string]): string =>
  bands[Math.min(2, Math.floor((index * 3) / count))];

/**
 * The ordered categories: evenly spaced numbers, described the same way. Their
 * traits fall out of the numbers themselves — which third of the scale a value
 * sits in, and whether it is odd or even — so they are as checkable as any
 * other, and the blurbs are written one per rung.
 */
function scale(spec: {
  id: string;
  name: string;
  pattern: string;
  describes: string;
  noun: string;
  start: number;
  step: number;
  count: number;
  format: (value: number) => string;
  bands: [string, string, string];
  bandLabel: string;
  /** How the odd/even trait reads: "{noun} in an {} year". */
  parityPattern?: string;
  icons: [string, string, string];
  blurbs: string[];
  ordered: OrderedMeta;
}): CategoryDef {
  const traits: TraitDef[] = [
    { id: 'band', label: spec.bandLabel, pattern: '{} {noun}' },
    {
      id: 'parity',
      label: 'Number',
      pattern: spec.parityPattern ?? '{noun} with an {} number',
    },
  ];
  const items: ItemDef[] = Array.from({ length: spec.count }, (_, index) => {
    const value = spec.start + index * spec.step;
    const band = bandOf(index, spec.count, spec.bands);
    return {
      label: spec.format(value),
      value,
      icon: spec.icons[spec.bands.indexOf(band)],
      blurb: spec.blurbs[index].replace('{}', spec.format(value)),
      traits: { band, parity: value % 2 === 0 ? 'even' : 'odd' },
    };
  });
  return {
    id: spec.id,
    name: spec.name,
    pattern: spec.pattern,
    describes: spec.describes,
    noun: spec.noun,
    traits,
    items,
    ordered: spec.ordered,
  };
}

const PERSON_TRAITS: TraitDef[] = [
  { id: 'hair', label: 'Hair', pattern: '{noun} with {} hair' },
  { id: 'eyes', label: 'Eyes', pattern: '{noun} with {} eyes' },
  { id: 'sign', label: 'Star sign', pattern: '{noun} born under {}' },
];

export const THEMES: ThemeDef[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Voyage',
    emoji: '🚀',
    blurb: 'Crews, ships and launch windows',
    accent: '#4C6FFF',
    categories: [
      set(
        {
          id: 'astronaut',
          name: 'Astronaut',
          pattern: '{}',
          describes: 'the {}',
          noun: 'astronaut',
          traits: PERSON_TRAITS,
        },
        // prettier-ignore
        [
          ['Nova', '👩‍🦰', 'red', 'green', 'Aries', 'Files every flight plan in crayon. They keep being approved.'],
          ['Rhea', '👩‍🦳', 'silver', 'grey', 'Taurus', 'Sleeps through re-entry. Has never once missed a meal.'],
          ['Iris', '🧑‍🦱', 'black', 'brown', 'Gemini', 'Talks to the ship. Maintains the ship started it.'],
          ['Milo', '👱', 'blonde', 'blue', 'Cancer', 'Packed three spare toothbrushes and no spare socks.'],
          ['Vega', '🧑‍🦰', 'red', 'hazel', 'Leo', 'Salutes the airlock. The airlock has stopped saluting back.'],
          ['Juno', '👩', 'brown', 'brown', 'Virgo', 'Labels everything on board, including the labels.'],
          ['Orin', '👨‍🦳', 'silver', 'blue', 'Libra', 'Swears a comet winked at him. Twice, and on the record.'],
          ['Cass', '🧔', 'black', 'green', 'Scorpio', 'Grows basil in a spare helmet. It is thriving; morale is not.'],
          ['Elio', '👨', 'brown', 'grey', 'Sagittarius', 'Hums through docking. Hums louder through emergencies.'],
          ['Suri', '👩‍🦱', 'black', 'hazel', 'Capricorn', 'Wins every weightless card game and will not say how.'],
          ['Dax', '👱‍♂️', 'blonde', 'brown', 'Aquarius', 'Named the coffee machine and now takes its side in disputes.'],
          ['Noor', '🧕', 'black', 'brown', 'Pisces', 'Sketches each world on the way down. The sketches never match.'],
          ['Kai', '🧑', 'brown', 'blue', 'Aries', 'Volunteers for every spacewalk, chiefly for the view.'],
          ['Wren', '👩‍🦰', 'red', 'grey', 'Leo', 'Keeps an orbital diary. Entry one reads: still up here.'],
        ],
      ),
      set(
        {
          id: 'destination',
          name: 'Destination',
          pattern: 'the crew bound for {}',
          describes: 'the crew bound for the {}',
          noun: 'world',
          traits: [
            { id: 'kind', label: 'Kind', pattern: '{noun} that is a {}' },
            { id: 'surface', label: 'Surface', pattern: '{noun} with a {} surface' },
            { id: 'gravity', label: 'Gravity', pattern: '{noun} with {} gravity' },
          ],
        },
        // prettier-ignore
        [
          ['Mars', '🔴', 'planet', 'dusty', 'middling', 'Red, windy, and entirely without a gift shop.'],
          ['Venus', '🟠', 'planet', 'volcanic', 'heavy', 'Hot enough to melt a probe. Lovely from a great distance.'],
          ['Titan', '🟤', 'moon', 'frozen', 'feeble', 'Has lakes. None of them are water. None of them are for swimming.'],
          ['Europa', '🧊', 'moon', 'frozen', 'feeble', 'Ice on top, ocean beneath, and something nobody wants to meet.'],
          ['Ceres', '🪨', 'dwarf planet', 'rocky', 'feeble', 'The largest thing in the asteroid belt, which is faint praise.'],
          ['Io', '🌋', 'moon', 'volcanic', 'feeble', 'Four hundred volcanoes and not one fire escape.'],
          ['Luna', '🌕', 'moon', 'dusty', 'light', "Close, grey, and covered in other people's footprints."],
          ['Vesta', '☄️', 'asteroid', 'rocky', 'feeble', 'A lump with a mountain on it twice the height of Everest.'],
          ['Callisto', '🌑', 'moon', 'rocky', 'light', 'The most cratered thing in the system, and quietly proud of it.'],
          ['Ganymede', '🟡', 'moon', 'frozen', 'light', 'Bigger than Mercury and still filed under moon.'],
          ['Enceladus', '💧', 'moon', 'frozen', 'feeble', 'Sprays water into space. Nobody has asked it to stop.'],
          ['Triton', '🔵', 'moon', 'frozen', 'feeble', 'Orbits backwards, deliberately, out of what looks like spite.'],
          ['Phobos', '🥔', 'moon', 'rocky', 'feeble', 'Potato-shaped and slowly falling. There is no particular rush.'],
          ['Deimos', '🌘', 'moon', 'dusty', 'feeble', 'The smaller, quieter one. It prefers things that way.'],
        ],
      ),
      set(
        {
          id: 'ship',
          name: 'Ship',
          pattern: 'the {}',
          describes: 'the {}',
          noun: 'ship',
          traits: [
            { id: 'hull', label: 'Hull', pattern: '{noun} made of {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
            { id: 'engine', label: 'Engine', pattern: '{noun} with {} engines' },
          ],
        },
        // prettier-ignore
        [
          ['Kestrel', '🚀', 'steel', 'small', 'nuclear', 'Fast, loud, and fond of announcing both.'],
          ['Corvus', '🛸', 'carbon', 'small', 'ion', 'Black as a pocket. Impossible to find in the dark.'],
          ['Lyra', '🛰️', 'carbon', 'mid-sized', 'solar', 'Sings on re-entry. The engineers have given up explaining it.'],
          ['Orion', '🚀', 'steel', 'huge', 'nuclear', 'Built for grandeur. Turns like a cathedral.'],
          ['Pallas', '🛰️', 'titanium', 'huge', 'solar', 'Carries everything. Finds nothing when asked.'],
          ['Sable', '🛸', 'carbon', 'small', 'ion', 'Silent running as standard, chiefly to unnerve visitors.'],
          ['Merlin', '🚀', 'steel', 'mid-sized', 'nuclear', 'Reliable to a fault, and the fault is a rattling hatch.'],
          ['Halcyon', '🛰️', 'titanium', 'mid-sized', 'solar', 'The calmest ship in the fleet. Nothing has gone wrong yet.'],
          ['Vesper', '🛸', 'copper', 'small', 'ion', 'Only truly happy after sundown, whatever that means out here.'],
          ['Nimbus', '🛰️', 'carbon', 'huge', 'solar', 'Leaves a cloud behind it. Nobody has traced the source.'],
          ['Aurora', '🛸', 'copper', 'mid-sized', 'ion', 'Glows faintly. The crew have stopped mentioning it.'],
          ['Cygnus', '🚀', 'steel', 'huge', 'nuclear', 'Long-necked, long-winded, and long overdue a refit.'],
          ['Perseus', '🛰️', 'titanium', 'mid-sized', 'solar', 'Named for a hero. Handles like a filing cabinet.'],
          ['Zephyr', '🛸', 'copper', 'small', 'ion', 'Light enough to be pushed by sunlight and vain about it.'],
        ],
      ),
      set(
        {
          id: 'cargo',
          name: 'Cargo',
          pattern: 'the {} payload',
          describes: 'the {}',
          noun: 'payload',
          traits: [
            { id: 'weight', label: 'Weight', pattern: '{} {noun}' },
            { id: 'material', label: 'Made of', pattern: '{noun} made of {}' },
            { id: 'care', label: 'Handling', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Seed Vault', '🌱', 'middling', 'metal', 'fragile', 'Every crop humanity has, in a box the size of a fridge.'],
          ['Ice Core', '🧊', 'heavy', 'glass', 'fragile', 'A very old winter, kept in a tube and thoroughly resented.'],
          ['Solar Sail', '⛵', 'light', 'fabric', 'fragile', 'Acres of mirror, folded like a napkin, opened once.'],
          ['Rover Kit', '🛞', 'heavy', 'metal', 'rugged', 'Some assembly required. The instructions were left behind.'],
          ['Med Pods', '🩹', 'middling', 'plastic', 'fragile', 'Six beds and a cheerful voice that will not be turned off.'],
          ['Star Maps', '🗺️', 'light', 'paper', 'fragile', 'Printed, because screens have opinions about radiation.'],
          ['Water Tank', '💧', 'heavy', 'metal', 'rugged', 'Two tonnes of drinking water and one very serious lid.'],
          ['Drone Bay', '🛩️', 'heavy', 'metal', 'rugged', 'Eight little scouts, all of which return in a mood.'],
          ['Soil Lab', '🧪', 'middling', 'glass', 'fragile', 'Where dirt is asked, politely, whether anything ever lived in it.'],
          ['Fuel Cells', '🔋', 'heavy', 'metal', 'rugged', 'Enough power for the trip home, assuming nobody charges a kettle.'],
          ['Greenhouse', '🪴', 'middling', 'glass', 'fragile', 'Tomatoes in orbit. They taste of homesickness.'],
          ['Repair Kit', '🧰', 'middling', 'metal', 'rugged', 'Tape, wire and hope, in roughly that proportion.'],
          ['Comms Mast', '📡', 'light', 'metal', 'fragile', 'Points at home. Does nothing else, and does it well.'],
          ['Sample Case', '📦', 'light', 'plastic', 'rugged', 'Empty on the way out. Nobody agrees on what fills it.'],
        ],
      ),
      scale({
        id: 'launch',
        name: 'Launch',
        pattern: 'the {} launch',
        describes: 'the {}',
        noun: 'launch',
        start: 2031,
        step: 1,
        count: 14,
        format: (value) => `${value}`,
        bands: ['early', 'middling', 'late'],
        bandLabel: 'Window',
        parityPattern: '{noun} in an {} year',
        icons: ['🗓️', '⏳', '🔭'],
        // prettier-ignore
        blurbs: [
          'The {} window. Everything still smells of new upholstery.',
          'The {} window. Booked out by a school trip and rebooked in a hurry.',
          'The {} window. Delayed twice for weather on a world with no weather.',
          'The {} window. The one with the famous countdown mishap.',
          'The {} window. Sponsored, briefly, by a soft drink.',
          'The {} window. The crew insisted on real coffee and got it.',
          'The {} window. Launched an hour early because nobody objected.',
          'The {} window. Rained off, then launched through the rain anyway.',
          'The {} window. Best sandwiches of any mission, by common consent.',
          'The {} window. Someone left a cat toy aboard. It is still up there.',
          'The {} window. The last launch before the pad was repainted.',
          'The {} window. Held for a passing satellite that was in no hurry.',
          'The {} window. Watched by more people than the moon landings.',
          'The {} window. The one they will be talking about in the canteen.',
        ],
        ordered: { noun: 'launch year', unit: 'years', greater: 'later', lesser: 'earlier' },
      }),
    ],
    clues: {
      link: '{a} shares a mission with {b}.',
      notLink: '{a} does not share a mission with {b}.',
      groupNot: 'No {a} shares a mission with {b}.',
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
      set(
        {
          id: 'customer',
          name: 'Customer',
          pattern: '{}',
          describes: 'the {}',
          noun: 'customer',
          traits: PERSON_TRAITS,
        },
        // prettier-ignore
        [
          ['Alma', '👩‍🦳', 'silver', 'blue', 'Aries', 'Orders the same thing daily and reads the menu each time.'],
          ['Basil', '🧔', 'black', 'brown', 'Taurus', 'Brings his own mug. It is larger than the café allows for.'],
          ['Dax', '👱‍♂️', 'blonde', 'green', 'Gemini', 'Answers emails aloud. Nobody has found the courage to mention it.'],
          ['Esme', '👩‍🦰', 'red', 'hazel', 'Cancer', 'Tips in coins, always exact, always counted twice.'],
          ['Fen', '🧑‍🦱', 'black', 'grey', 'Leo', 'Sits down before ordering, as though daring the staff.'],
          ['Grier', '👨‍🦳', 'silver', 'brown', 'Virgo', 'Does the crossword in pen and finishes it in ink of two colours.'],
          ['Hollis', '👨', 'brown', 'blue', 'Libra', 'Has strong views on foam and is not shy about them.'],
          ['Ines', '👩', 'brown', 'brown', 'Scorpio', 'Reads a chapter, leaves, returns for the next one at noon.'],
          ['Jonas', '👱', 'blonde', 'blue', 'Sagittarius', 'Claims the corner table is his. It has never been his.'],
          ['Kit', '🧑‍🦰', 'red', 'green', 'Capricorn', 'Brings the dog. The dog has its own regular order.'],
          ['Lena', '👩‍🦱', 'black', 'hazel', 'Aquarius', 'Photographs the pastry before eating it. Every single time.'],
          ['Mika', '🧑', 'brown', 'grey', 'Pisces', 'Comes for the wifi, stays for the arguments about the wifi.'],
          ['Nell', '👵', 'silver', 'green', 'Aries', 'Knows every regular by order rather than by name.'],
          ['Otto', '🧑‍🦲', 'no', 'brown', 'Leo', 'Reads the paper back to front and will explain why if asked.'],
        ],
      ),
      set(
        {
          id: 'drink',
          name: 'Drink',
          pattern: 'the {} drinker',
          describes: 'the drinker of the {}',
          noun: 'drink',
          traits: [
            { id: 'served', label: 'Served', pattern: '{} {noun}' },
            { id: 'strength', label: 'Strength', pattern: '{} {noun}' },
            { id: 'milk', label: 'Milk', pattern: '{noun} {}' },
          ],
        },
        // prettier-ignore
        [
          ['Latte', '🥛', 'hot', 'gentle', 'with milk', 'More milk than coffee, and honest about it.'],
          ['Mocha', '🍫', 'hot', 'gentle', 'with milk', 'Pudding in a cup, ordered with a straight face.'],
          ['Chai', '🫖', 'hot', 'gentle', 'with milk', 'Spiced, sweet, and always a little too hot to start.'],
          ['Cortado', '☕️', 'hot', 'strong', 'with milk', 'Small, serious, and gone in three sips.'],
          ['Matcha', '🍵', 'hot', 'gentle', 'with milk', 'Bright green and quietly smug about the antioxidants.'],
          ['Espresso', '⚡️', 'hot', 'strong', 'without milk', 'A thimble of pure intent.'],
          ['Flat White', '🤍', 'hot', 'strong', 'with milk', 'The subject of a long-running dispute with the latte.'],
          ['Americano', '💧', 'hot', 'strong', 'without milk', 'An espresso that has been talked down from the ledge.'],
          ['Cappuccino', '🫧', 'hot', 'strong', 'with milk', 'One third foam, and the third everyone argues about.'],
          ['Macchiato', '🔸', 'hot', 'strong', 'with milk', 'Espresso wearing the smallest possible hat.'],
          ['Cold Brew', '🧊', 'iced', 'strong', 'without milk', 'Steeped overnight by someone who plans ahead.'],
          ['Oat Latte', '🌾', 'hot', 'gentle', 'with milk', 'The milk that started a thousand conversations.'],
          ['Mint Tea', '🌿', 'hot', 'gentle', 'without milk', 'Ordered after a large lunch, without exception.'],
          ['Hot Choc', '🍩', 'hot', 'gentle', 'with milk', 'Comes with marshmallows whether or not anyone asked.'],
        ],
      ),
      set(
        {
          id: 'pastry',
          name: 'Pastry',
          pattern: 'the {}',
          describes: 'the {}',
          noun: 'pastry',
          traits: [
            { id: 'texture', label: 'Texture', pattern: '{} {noun}' },
            { id: 'filling', label: 'Filled with', pattern: '{noun} filled with {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Croissant', '🥐', 'flaky', 'nothing', 'big', 'Leaves a trail across the table that outlives the meal.'],
          ['Cannelé', '🟤', 'crisp', 'custard', 'small', 'Burnt on purpose. Do not attempt to send it back.'],
          ['Scone', '🧈', 'crumbly', 'nothing', 'big', 'Starts a war about the order of jam and cream.'],
          ['Éclair', '🍫', 'soft', 'cream', 'big', 'Impossible to eat with dignity. Nobody manages it.'],
          ['Brioche', '🍞', 'soft', 'nothing', 'big', 'More butter than bread, which is the entire point.'],
          ['Tartlet', '🍓', 'crisp', 'fruit', 'small', 'Glazed to a shine you can check your hair in.'],
          ['Danish', '🌀', 'flaky', 'fruit', 'big', 'Named after a country that would like a word about it.'],
          ['Madeleine', '🐚', 'soft', 'nothing', 'small', 'One bite of it and you are nine years old again.'],
          ['Palmier', '🌴', 'crisp', 'nothing', 'small', 'All edges, no middle, and gone before the coffee lands.'],
          ['Doughnut', '🍩', 'soft', 'jam', 'big', 'The jam is always in the last bite or the first. Never both.'],
          ['Muffin', '🧁', 'crumbly', 'fruit', 'big', 'A cake pretending, for breakfast purposes, to be bread.'],
          ['Baklava', '🍯', 'flaky', 'nuts', 'small', 'Forty layers, all of them sticky, none of them regretted.'],
          ['Cruffin', '🥯', 'flaky', 'cream', 'big', 'A croissant and a muffin, filed as neither.'],
          ['Turnover', '📐', 'flaky', 'fruit', 'big', 'Molten inside for far longer than seems physically fair.'],
        ],
      ),
      set(
        {
          id: 'seat',
          name: 'Seat',
          pattern: 'the {} table',
          describes: 'the {}',
          noun: 'table',
          traits: [
            { id: 'where', label: 'Where', pattern: '{noun} {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
            { id: 'light', label: 'Light', pattern: '{noun} in the {}' },
          ],
        },
        // prettier-ignore
        [
          ['Window', '🪟', 'indoors', 'roomy', 'sun', 'Best for watching the street judge your order.'],
          ['Corner', '📐', 'indoors', 'snug', 'shade', 'Where the laptops go to nest for the afternoon.'],
          ['Patio', '⛱️', 'outdoors', 'roomy', 'sun', 'Charming for eleven minutes a year.'],
          ['Counter', '🪑', 'indoors', 'snug', 'shade', 'A front-row seat to the machine and the swearing.'],
          ['Loft', '🪜', 'indoors', 'roomy', 'shade', 'Up the creaking stairs. Nobody is ever sent to find you.'],
          ['Fireside', '🔥', 'indoors', 'snug', 'shade', 'Warm enough that leaving becomes a whole decision.'],
          ['Balcony', '🌇', 'outdoors', 'snug', 'sun', 'Two chairs, one railing, and a queue for both.'],
          ['Alcove', '🕳️', 'indoors', 'snug', 'shade', 'Nobody finds you here, including the staff with your order.'],
          ['Bar Stool', '🍸', 'indoors', 'snug', 'sun', 'Comfortable for exactly as long as one coffee lasts.'],
          ['Booth', '🛋️', 'indoors', 'roomy', 'shade', 'Seats four, occupied by one and a great many bags.'],
          ['Terrace', '🌿', 'outdoors', 'roomy', 'sun', 'Sunny, breezy, and one gust from losing every napkin.'],
          ['Garden', '🌼', 'outdoors', 'roomy', 'shade', 'Shared with a robin who has learned about crumbs.'],
          ['Nook', '📚', 'indoors', 'snug', 'shade', 'Shelved on three sides. The books are glued in place.'],
          ['Bench', '🪵', 'outdoors', 'roomy', 'sun', 'Seats three politely, or two people with strong opinions.'],
        ],
      ),
      scale({
        id: 'bill',
        name: 'Bill',
        pattern: 'the {} bill',
        describes: 'the {}',
        noun: 'bill',
        start: 4,
        step: 1,
        count: 14,
        format: (value) => `$${value}`,
        bands: ['modest', 'middling', 'steep'],
        bandLabel: 'Size',
        icons: ['🪙', '💵', '💸'],
        // prettier-ignore
        blurbs: [
          'A {} ticket. Paid in coins, counted twice, correct both times.',
          'A {} ticket. The smallest order anyone has admitted to.',
          'A {} ticket. Rounded up, because the tip jar was watching.',
          'A {} ticket. Split three ways after some very slow arithmetic.',
          'A {} ticket. Settled by card, then queried, then settled again.',
          'A {} ticket. Includes one pastry that was denied at the till.',
          'A {} ticket. Exactly the price of a quiet hour, apparently.',
          'A {} ticket. Somebody was buying for a friend and regretting it.',
          'A {} ticket. Two drinks and a great deal of foam.',
          'A {} ticket. The morning the oat milk went up and nobody warned anyone.',
          'A {} ticket. A round for the table, bravely announced.',
          'A {} ticket. Paid with a note so large the till sighed.',
          'A {} ticket. The record, until the office came in on Friday.',
          'A {} ticket. Framed behind the counter, unofficially.',
        ],
        ordered: { noun: 'bill', unit: 'dollars', greater: 'higher', lesser: 'lower' },
      }),
    ],
    clues: {
      link: '{a} is on the same ticket as {b}.',
      notLink: '{a} is not on the same ticket as {b}.',
      groupNot: 'No {a} is on the same ticket as {b}.',
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
      set(
        {
          id: 'hero',
          name: 'Hero',
          pattern: '{}',
          describes: 'the {}',
          noun: 'hero',
          traits: PERSON_TRAITS,
        },
        // prettier-ignore
        [
          ['Bran', '🧔', 'black', 'brown', 'Aries', 'Swore an oath on a bridge and has been explaining it ever since.'],
          ['Sorrel', '👩‍🦰', 'red', 'green', 'Taurus', 'Fights beautifully. Navigates like a dropped map.'],
          ['Ivo', '👨‍🦳', 'silver', 'grey', 'Gemini', 'Retired three times. Keeps being invited back by circumstance.'],
          ['Wren', '👩‍🦱', 'black', 'hazel', 'Cancer', 'Small, quick, and responsible for most of the shouting.'],
          ['Tamsin', '👱‍♀️', 'blonde', 'blue', 'Leo', 'Rides ahead. Waits at the crossroads with a smug expression.'],
          ['Kell', '🧑‍🦱', 'black', 'green', 'Virgo', 'Counts the gold before the fight, which is considered rude.'],
          ['Rowan', '🧑‍🦰', 'red', 'brown', 'Libra', 'Talks to horses. The horses appear to answer.'],
          ['Fenn', '👨', 'brown', 'blue', 'Scorpio', 'Once slew a beast by accident and has never once corrected anyone.'],
          ['Maeve', '👩‍🦳', 'silver', 'green', 'Sagittarius', 'Carries a lute she cannot play into every single tavern.'],
          ['Osric', '🧙', 'silver', 'brown', 'Capricorn', 'Insists on a prophecy before breakfast. Any prophecy.'],
          ['Perrin', '🧑', 'brown', 'hazel', 'Aquarius', 'Youngest of the company and the only one who packs food.'],
          ['Isolde', '👩', 'brown', 'grey', 'Pisces', 'Sharpens her blade during conversations. It is not a threat.'],
          ['Garrick', '🥷', 'black', 'brown', 'Aries', 'Arrives silently, leaves loudly, bills generously.'],
          ['Nyla', '🦸', 'red', 'blue', 'Leo', 'Has a battle cry. Nobody has worked out what it means.'],
        ],
      ),
      set(
        {
          id: 'weapon',
          name: 'Weapon',
          pattern: 'the {} wielder',
          describes: 'the wielder of the {}',
          noun: 'weapon',
          traits: [
            { id: 'material', label: 'Made of', pattern: '{noun} made of {}' },
            { id: 'reach', label: 'Reach', pattern: '{} {noun}' },
            { id: 'weight', label: 'Weight', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Ash Bow', '🏹', 'wood', 'long', 'light', 'Draws smooth as a promise. Twice as likely to be broken.'],
          ['Rune Axe', '🪓', 'iron', 'short', 'heavy', 'Carved with words nobody living can read. Probably a warranty.'],
          ['Gale Spear', '🌬️', 'wood', 'long', 'light', 'Whistles in flight, which ruins every ambush it is part of.'],
          ['Ember Blade', '🔥', 'iron', 'short', 'light', 'Warm to the touch. Terrible in a scabbard, superb in a snowstorm.'],
          ['Frost Flail', '❄️', 'iron', 'short', 'heavy', 'Leaves a rime on everything, including its owner.'],
          ['Thorn Whip', '🌹', 'leather', 'long', 'light', 'Beautiful. Has drawn more of its owner’s blood than anyone else’s.'],
          ['Storm Mace', '⚡️', 'iron', 'short', 'heavy', 'Attracts lightning. Best carried by somebody else.'],
          ['Moon Dagger', '🌙', 'silver', 'short', 'light', 'Only sharp after dark, which is when it is needed.'],
          ['Oak Staff', '🪵', 'wood', 'long', 'heavy', 'A walking stick with ideas above its station.'],
          ['Bone Sling', '🦴', 'bone', 'short', 'light', 'Cheap, quiet, and unreasonably effective against giants.'],
          ['Star Lance', '⭐️', 'silver', 'long', 'heavy', 'Fell from the sky. Nobody has asked it to leave.'],
          ['Wind Sabre', '🌪️', 'silver', 'long', 'light', 'Cuts on the backswing, which surprises everyone once.'],
          ['Shadow Pike', '🕳️', 'bone', 'long', 'heavy', 'Casts no shadow, which is considered showing off.'],
          ['Iron Halberd', '⚔️', 'iron', 'long', 'heavy', 'Requires two hands, a wide room and a forgiving ceiling.'],
        ],
      ),
      set(
        {
          id: 'beast',
          name: 'Beast',
          pattern: 'the {} slayer',
          describes: 'the slayer of the {}',
          noun: 'beast',
          traits: [
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
            { id: 'home', label: 'Lairs in the', pattern: '{noun} from the {}' },
            { id: 'temper', label: 'Temper', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Griffin', '🦅', 'huge', 'mountains', 'proud', 'Half eagle, half lion, entirely convinced of its own importance.'],
          ['Wyvern', '🐉', 'huge', 'mountains', 'fierce', 'Two legs, one temper, no interest in negotiation.'],
          ['Basilisk', '🦎', 'small', 'caves', 'sly', 'Do not meet its eye. Do not meet its other eye either.'],
          ['Kraken', '🦑', 'huge', 'sea', 'fierce', 'The reason the harbour tax is what it is.'],
          ['Chimera', '🦁', 'huge', 'mountains', 'fierce', 'Three heads, none of which agree on lunch.'],
          ['Sphinx', '🐈', 'huge', 'desert', 'sly', 'Asks a riddle. Is visibly bored of the answer.'],
          ['Manticore', '🦂', 'huge', 'desert', 'fierce', 'Tail like a quiver. Manners like a tax collector.'],
          ['Hydra', '🐍', 'huge', 'marshes', 'fierce', 'Cut off one head and you have made the day considerably worse.'],
          ['Cyclops', '👁️', 'huge', 'caves', 'proud', 'Terrible depth perception, excellent grudge retention.'],
          ['Banshee', '👻', 'small', 'marshes', 'sly', 'Announces deaths. Has never once been thanked for it.'],
          ['Golem', '🗿', 'huge', 'caves', 'calm', 'Follows the last instruction it was given, forever, to the letter.'],
          ['Harpy', '🪶', 'small', 'mountains', 'sly', 'Steals food, insults the cook, leaves a feather as receipt.'],
          ['Minotaur', '🐂', 'huge', 'caves', 'fierce', 'Knows the way out. Has decided not to share it.'],
          ['Direwolf', '🐺', 'small', 'forest', 'proud', 'Runs with a pack of six and takes all the credit.'],
        ],
      ),
      set(
        {
          id: 'realm',
          name: 'Realm',
          pattern: 'the champion of {}',
          describes: 'the champion of the {}',
          noun: 'realm',
          traits: [
            { id: 'land', label: 'Land', pattern: '{noun} of {}' },
            { id: 'weather', label: 'Weather', pattern: '{noun} with {} weather' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Ashfell', '🌋', 'mountains', 'dry', 'small', 'Everything is grey and everyone insists it is character.'],
          ['Duskmoor', '🌑', 'marshes', 'wet', 'great', 'The sun sets at three and apologises for nothing.'],
          ['Highmere', '🏔️', 'mountains', 'cold', 'great', 'Thin air, thick accents, excellent cheese.'],
          ['Ironvale', '⚒️', 'mountains', 'dry', 'great', 'Makes half the swords in the world and complains about the noise.'],
          ['Sablewood', '🌲', 'forest', 'wet', 'great', 'Dark by noon. The trees are said to keep notes.'],
          ['Windreach', '💨', 'coast', 'cold', 'small', 'Hats are a formality here. Nobody bothers.'],
          ['Thornhold', '🏰', 'forest', 'dry', 'small', 'Walled, moated, and famous for a hedge nobody can get through.'],
          ['Greymarch', '🌫️', 'marshes', 'wet', 'great', 'Fog with a flag. The border moves when it feels like it.'],
          ['Frostgate', '❄️', 'mountains', 'cold', 'small', 'Six months of winter, then a stern autumn.'],
          ['Emberholt', '🔥', 'forest', 'dry', 'small', 'Warm all year from something underground nobody discusses.'],
          ['Larkspur', '🌸', 'coast', 'mild', 'small', 'Blossom everywhere. Suspiciously cheerful for a war-torn age.'],
          ['Mistvale', '☁️', 'marshes', 'wet', 'small', 'Visitors get lost. Locals claim this is a feature.'],
          ['Stonebrook', '🪨', 'coast', 'mild', 'great', 'Every building is grey and every story is longer than it needs to be.'],
          ['Ravenfen', '🐦‍⬛', 'marshes', 'cold', 'small', 'The birds outnumber the people and know it.'],
        ],
      ),
      scale({
        id: 'reward',
        name: 'Reward',
        pattern: 'the {} reward',
        describes: 'the {}',
        noun: 'reward',
        start: 30,
        step: 15,
        count: 14,
        format: (value) => `${value}g`,
        bands: ['small', 'fair', 'princely'],
        bandLabel: 'Purse',
        icons: ['🪙', '💰', '👑'],
        // prettier-ignore
        blurbs: [
          'A {} purse. Barely covers the horse feed and the bandages.',
          'A {} purse. Paid in copper, weighed in front of witnesses.',
          'A {} purse. The village emptied its jar and looked hopeful.',
          'A {} purse. Half up front, the rest promised on a handshake.',
          'A {} purse. Enough for a decent inn and one terrible decision.',
          'A {} purse. Comes with a goat that nobody asked about.',
          'A {} purse. The bard demanded a share before the fight began.',
          'A {} purse. The mayor made a speech, which cost extra.',
          'A {} purse. Delivered in a chest too heavy for one hero.',
          'A {} purse. Enough to retire on, briefly, in a cheap realm.',
          'A {} purse. Paid in old coin with an unfamiliar king on it.',
          'A {} purse. The kind that attracts a second set of bandits.',
          'A {} purse. Sung about for three counties and two generations.',
          'A {} purse. The largest since the dragon business, and still talked of.',
        ],
        ordered: { noun: 'reward', unit: 'gold', greater: 'larger', lesser: 'smaller' },
      }),
    ],
    clues: {
      link: '{a} is none other than {b}.',
      notLink: '{a} is not {b}.',
      groupNot: 'No {a} is {b}.',
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
      set(
        {
          id: 'diver',
          name: 'Diver',
          pattern: '{}',
          describes: 'the {}',
          noun: 'diver',
          traits: PERSON_TRAITS,
        },
        // prettier-ignore
        [
          ['Pia', '👩‍🦰', 'red', 'green', 'Aries', 'Checks her gauge every ninety seconds and denies doing it.'],
          ['Rune', '🧔', 'black', 'blue', 'Taurus', 'Surfaces last, always, and never says what he was looking at.'],
          ['Sena', '👩‍🦱', 'black', 'brown', 'Gemini', 'Names every fish she meets. Recognises several by sight.'],
          ['Tobin', '👱‍♂️', 'blonde', 'grey', 'Cancer', 'Sings underwater. It sounds exactly as good as it should.'],
          ['Ada', '👩‍🦳', 'silver', 'hazel', 'Leo', 'Forty years in the water and one story she will not tell.'],
          ['Nico', '🧑', 'brown', 'brown', 'Virgo', 'Draws the reef in pencil on a slate, then loses the slate.'],
          ['Marlow', '👨‍🦳', 'silver', 'blue', 'Libra', 'Has a boat, a theory, and a great deal of time.'],
          ['Indra', '🧑‍🦱', 'black', 'green', 'Scorpio', 'Descends like a stone and comes up like a cork.'],
          ['Cleo', '👩', 'brown', 'grey', 'Sagittarius', 'Photographs everything. The camera is bigger than she is.'],
          ['Bo', '🧑‍🦰', 'red', 'brown', 'Capricorn', 'Claims to have met the same turtle four years running.'],
          ['Yara', '👩‍🦰', 'red', 'hazel', 'Aquarius', 'Logs every dive in a book that has been underwater twice.'],
          ['Elias', '👨', 'brown', 'blue', 'Pisces', 'Talks about currents at dinner until somebody changes the subject.'],
          ['Suki', '👱‍♀️', 'blonde', 'green', 'Aries', 'The only one who enjoys the safety stop.'],
          ['Rafa', '🧑‍🦲', 'no', 'brown', 'Leo', 'Fixes everyone else’s gear and forgets to check his own.'],
        ],
      ),
      set(
        {
          id: 'species',
          name: 'Sighting',
          pattern: 'the {} spotter',
          describes: 'the spotter of the {}',
          noun: 'creature',
          traits: [
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
            { id: 'danger', label: 'Danger', pattern: '{} {noun}' },
            { id: 'body', label: 'Body', pattern: '{noun} with {}' },
          ],
        },
        // prettier-ignore
        [
          ['Octopus', '🐙', 'big', 'harmless', 'no bones', 'Solves the puzzle, takes the treat, judges the scientist.'],
          ['Manta', '🪽', 'big', 'harmless', 'smooth skin', 'Five metres across and glides past like a rumour.'],
          ['Turtle', '🐢', 'big', 'harmless', 'a shell', 'Older than the boat, the crew, and most of the harbour.'],
          ['Seahorse', '🐴', 'tiny', 'harmless', 'armour', 'Holds on with its tail and refuses to be photographed.'],
          ['Moray', '🐍', 'big', 'venomous', 'smooth skin', 'Lives in a hole and looks permanently unimpressed.'],
          ['Clownfish', '🤡', 'tiny', 'harmless', 'smooth skin', 'Owns one anemone and defends it against the entire ocean.'],
          ['Barracuda', '⚔️', 'big', 'venomous', 'smooth skin', 'All teeth and no small talk.'],
          ['Stingray', '🥏', 'big', 'venomous', 'smooth skin', 'Sleeps under the sand and dislikes being stepped on.'],
          ['Lionfish', '🦁', 'tiny', 'venomous', 'spines', 'Dressed for a ball it will never be invited to.'],
          ['Grouper', '🐟', 'big', 'harmless', 'smooth skin', 'Follows divers about hoping to be handed something.'],
          ['Pipefish', '➖', 'tiny', 'harmless', 'armour', 'A seahorse that has been through a mangle.'],
          ['Reef Shark', '🦈', 'big', 'venomous', 'smooth skin', 'Far more frightened of you, allegedly.'],
          ['Cuttlefish', '🎨', 'tiny', 'harmless', 'no bones', 'Changes colour mid-sentence to win the argument.'],
          ['Sea Urchin', '🌰', 'tiny', 'venomous', 'spines', 'Does nothing at all, extremely painfully.'],
        ],
      ),
      set(
        {
          id: 'gear',
          name: 'Gear',
          pattern: 'the diver with the {}',
          describes: 'the diver with the {}',
          noun: 'kit',
          traits: [
            { id: 'material', label: 'Made of', pattern: '{noun} made of {}' },
            { id: 'use', label: 'For', pattern: '{noun} for {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Red Fins', '🦶', 'rubber', 'swimming', 'big', 'Bought a size too large and worn with three pairs of socks.'],
          ['Blue Mask', '🥽', 'glass', 'seeing', 'small', 'Fogs up at the worst possible moment, every dive.'],
          ['Green Tank', '🧪', 'steel', 'breathing', 'big', 'Heavier out of the water than anyone expects.'],
          ['Yellow Torch', '🔦', 'steel', 'seeing', 'small', 'Bright enough to annoy an eel from ten metres.'],
          ['Black Camera', '📷', 'glass', 'recording', 'big', 'Insured for more than the boat it travels on.'],
          ['White Slate', '📝', 'plastic', 'recording', 'small', 'Where the great underwater conversations happen, badly spelled.'],
          ['Orange Reel', '🧵', 'plastic', 'safety', 'small', 'Two hundred metres of line and one very important knot.'],
          ['Pink Buoy', '🎈', 'rubber', 'safety', 'big', 'Deployed at the end. Visible from the boat, in theory.'],
          ['Silver Knife', '🔪', 'steel', 'safety', 'small', 'For cutting nets. Used, so far, on a sandwich.'],
          ['Teal Compass', '🧭', 'glass', 'finding the way', 'small', 'Points north. The reef declines to.'],
          ['Grey Gloves', '🧤', 'rubber', 'safety', 'small', 'Saved one set of knuckles and lost one wedding ring.'],
          ['Amber Lamp', '🏮', 'glass', 'seeing', 'big', 'The colour of a late afternoon, forty metres down.'],
          ['Coral Flag', '🚩', 'plastic', 'safety', 'big', 'Warns boats off. Boats occasionally read it.'],
          ['Navy Hood', '🧢', 'rubber', 'warmth', 'small', 'Keeps the head warm and the ears completely useless.'],
        ],
      ),
      set(
        {
          id: 'site',
          name: 'Site',
          pattern: 'the {} site',
          describes: 'the {}',
          noun: 'site',
          traits: [
            { id: 'terrain', label: 'Terrain', pattern: '{noun} of {}' },
            { id: 'current', label: 'Current', pattern: '{noun} with a {} current' },
            { id: 'light', label: 'Light', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Blue Hole', '🕳️', 'caves', 'calm', 'dark', 'Goes down further than the guidebook is willing to print.'],
          ['Lace Wall', '🪸', 'walls', 'strong', 'bright', 'Fan coral for a hundred metres. Nobody talks on the way back.'],
          ['Shipwreck', '⚓️', 'wreckage', 'calm', 'dark', 'A cargo of teapots, still stacked, still waiting.'],
          ['Kelp Maze', '🌿', 'weed', 'calm', 'dark', 'Easy to enter. The exit is a matter of opinion.'],
          ['Coral Arch', '🌉', 'walls', 'strong', 'bright', 'Swim through it for luck. Everyone does. Nobody admits why.'],
          ['Night Cove', '🌙', 'sand', 'calm', 'dark', 'Only worth diving after dark, which puts most people off.'],
          ['Tide Pools', '🪣', 'sand', 'strong', 'bright', 'Waist deep and full of things pretending to be rocks.'],
          ['Anchor Bay', '⚓️', 'sand', 'calm', 'bright', 'Two centuries of lost anchors, arranged by accident.'],
          ['Sea Fan Bay', '🪭', 'walls', 'calm', 'bright', 'Purple as a bruise and twice as photogenic.'],
          ['Lantern Reef', '🏮', 'walls', 'calm', 'bright', 'Glows at dusk. The science is disputed; the sight is not.'],
          ['Sunken Pier', '🛟', 'wreckage', 'strong', 'dark', 'The town moved. The pier stayed exactly where it was.'],
          ['Green Lagoon', '🥬', 'weed', 'calm', 'bright', 'Warm, shallow, and greener than seems entirely healthy.'],
          ['Cavern Ridge', '🗻', 'caves', 'strong', 'dark', 'A torch, a line, and a firm word with yourself.'],
          ['Turtle Point', '🐢', 'sand', 'calm', 'bright', 'Named optimistically. Delivers about one time in three.'],
        ],
      ),
      scale({
        id: 'depth',
        name: 'Depth',
        pattern: 'the diver at {}',
        describes: 'the diver at a {}',
        noun: 'depth',
        start: 10,
        step: 5,
        count: 14,
        format: (value) => `${value}m`,
        bands: ['shallow', 'middling', 'deep'],
        bandLabel: 'Range',
        icons: ['🐚', '🌊', '🕳️'],
        // prettier-ignore
        blurbs: [
          'A {} dive. Snorkellers keep asking what the fuss is about.',
          'A {} dive. Warm, bright, and over far too quickly.',
          'A {} dive. The colours start quietly leaving at this point.',
          'A {} dive. Red is already gone. Nobody misses it yet.',
          'A {} dive. Long enough down to forget the surface exists.',
          'A {} dive. Where the interesting fish stop being shy.',
          'A {} dive. The gauge becomes a topic of conversation.',
          'A {} dive. Cold enough to make the hood seem sensible.',
          'A {} dive. The torch comes on and stays on.',
          'A {} dive. Deep enough that the boat sounds like a rumour.',
          'A {} dive. Two divers, one line, and a great deal of trust.',
          'A {} dive. The safety stop is no longer optional in anyone’s mind.',
          'A {} dive. Written up in the log twice, for emphasis.',
          'A {} dive. The one they buy each other drinks over.',
        ],
        ordered: { noun: 'depth', unit: 'metres', greater: 'deeper', lesser: 'shallower' },
      }),
    ],
    clues: {
      link: '{a} and {b} were on the same dive.',
      notLink: '{a} and {b} were not on the same dive.',
      groupNot: 'No {a} was on the same dive as {b}.',
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
      set(
        {
          id: 'gardener',
          name: 'Gardener',
          pattern: '{}',
          describes: 'the {}',
          noun: 'gardener',
          traits: PERSON_TRAITS,
        },
        // prettier-ignore
        [
          ['Opal', '👩‍🦳', 'silver', 'blue', 'Aries', 'Has won this show eleven times and mentions it every year.'],
          ['Ferris', '🧔', 'black', 'brown', 'Taurus', 'Talks to the slugs. Negotiates. Loses.'],
          ['Hazel', '👩‍🦰', 'red', 'green', 'Gemini', 'Prunes on a strict schedule the plants have never agreed to.'],
          ['Lark', '🧑', 'brown', 'grey', 'Cancer', 'Waters at dawn to avoid conversation with neighbours.'],
          ['Pim', '👱', 'blonde', 'hazel', 'Leo', 'Grows one enormous thing a year and nothing else at all.'],
          ['Rosa', '👩‍🦱', 'black', 'brown', 'Virgo', 'Keeps a compost heap the council has asked about twice.'],
          ['Bram', '👨‍🦳', 'silver', 'blue', 'Libra', 'Believes in manure the way other people believe in medicine.'],
          ['Tilly', '👧', 'blonde', 'green', 'Scorpio', 'Twelve years old and already feared in the vegetable tent.'],
          ['Emrys', '👨', 'brown', 'brown', 'Sagittarius', 'Names each plant after a relative and reports on their health.'],
          ['Wilder', '🧑‍🦰', 'red', 'grey', 'Capricorn', 'Lets it all grow wild and wins the wildlife prize every time.'],
          ['Junie', '👩', 'brown', 'hazel', 'Aquarius', 'Deadheads other people’s roses on the walk home.'],
          ['Alder', '🧑‍🦱', 'black', 'green', 'Pisces', 'Has a greenhouse warmer than his house and no regrets.'],
          ['Posy', '👵', 'silver', 'brown', 'Aries', 'Judged the show for years. Entering it is her retirement.'],
          ['Marnie', '👩‍🦰', 'red', 'blue', 'Leo', 'Swears by seaweed and will bring you some, unasked.'],
        ],
      ),
      set(
        {
          id: 'flower',
          name: 'Flower',
          pattern: 'the {} grower',
          describes: 'the grower of the {}',
          noun: 'bloom',
          traits: [
            { id: 'colour', label: 'Colour', pattern: '{} {noun}' },
            { id: 'scent', label: 'Scent', pattern: '{noun} that smells {}' },
            { id: 'petals', label: 'Petals', pattern: '{noun} with {} petals' },
          ],
        },
        // prettier-ignore
        [
          ['Dahlia', '🌺', 'red', 'faint', 'many', 'A firework that has agreed to hold still for the judging.'],
          ['Peony', '🌸', 'pink', 'sweet', 'many', 'Blooms for a fortnight and sulks for the rest of the year.'],
          ['Iris', '💜', 'purple', 'faint', 'few', 'Named after a rainbow and behaves accordingly.'],
          ['Tulip', '🌷', 'red', 'faint', 'few', 'Once worth a house. Now worth a polite nod.'],
          ['Aster', '⭐️', 'purple', 'faint', 'many', 'A star that keeps flowering when everything else has given up.'],
          ['Zinnia', '🌼', 'orange', 'faint', 'many', 'Cut it and it grows back twice, out of spite.'],
          ['Lupin', '🗼', 'purple', 'peppery', 'many', 'A spire of flowers and a magnet for every aphid in the county.'],
          ['Freesia', '🤍', 'white', 'sweet', 'few', 'Smells better than anything else in the tent and knows it.'],
          ['Marigold', '🟠', 'orange', 'peppery', 'many', 'Planted to protect the vegetables. Steals the show instead.'],
          ['Foxglove', '🔔', 'pink', 'faint', 'many', 'Beautiful, statuesque, and not to be eaten under any circumstances.'],
          ['Camellia', '🎀', 'pink', 'faint', 'many', 'Drops every petal the night before the show, without fail.'],
          ['Sweet Pea', '🦋', 'white', 'sweet', 'few', 'The more you pick it the harder it works. A rare arrangement.'],
          ['Snapdragon', '🐉', 'orange', 'faint', 'few', 'Squeeze the flower and it talks. Children are delighted; judges are not.'],
          ['Cosmos', '🌌', 'white', 'faint', 'few', 'Grows six feet tall in poor soil and looks delicate doing it.'],
        ],
      ),
      set(
        {
          id: 'pot',
          name: 'Pot',
          pattern: 'the {} pot',
          describes: 'the {}',
          noun: 'pot',
          traits: [
            { id: 'material', label: 'Made of', pattern: '{noun} made of {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
            { id: 'finish', label: 'Finish', pattern: '{noun} with a {} finish' },
          ],
        },
        // prettier-ignore
        [
          ['Terracotta', '🟫', 'clay', 'big', 'matt', 'Chipped on one side, which the owner calls provenance.'],
          ['Cobalt', '🔵', 'glazed clay', 'big', 'glossy', 'Blue enough to be seen from the far end of the allotment.'],
          ['Ivory', '⚪️', 'glazed clay', 'small', 'glossy', 'Shows every speck of soil and is repotted indoors, carefully.'],
          ['Copper', '🟠', 'metal', 'small', 'glossy', 'Went green in a fortnight and looks better for it.'],
          ['Slate', '⬛️', 'stone', 'big', 'matt', 'Weighs as much as the plant and twice as much when watered.'],
          ['Mint', '🟩', 'glazed clay', 'small', 'glossy', 'Bought in a sale. Matches nothing else on the bench.'],
          ['Rust', '🟤', 'metal', 'big', 'matt', 'Rusted through the bottom, which is excellent for drainage.'],
          ['Cream', '🟡', 'clay', 'small', 'matt', 'Plain, sensible, and quietly the favourite.'],
          ['Indigo', '🔷', 'glazed clay', 'big', 'glossy', 'Deep blue and cracked twice by frost. Still going.'],
          ['Charcoal', '⬛️', 'stone', 'small', 'matt', 'Absorbs heat all afternoon and cooks the roots by August.'],
          ['Blush', '🩷', 'glazed clay', 'small', 'glossy', 'A gift. Kept out of politeness, then rather liked.'],
          ['Amber', '🟧', 'clay', 'big', 'matt', 'Glows at sunset and is photographed more than its plant.'],
          ['Olive', '🫒', 'metal', 'small', 'matt', 'Second-hand from a farm sale, dents and all.'],
          ['Plum', '🟣', 'stone', 'big', 'glossy', 'Immovable once filled. Its position is now permanent.'],
        ],
      ),
      set(
        {
          id: 'tool',
          name: 'Tool',
          pattern: 'the {} owner',
          describes: 'the owner of the {}',
          noun: 'tool',
          traits: [
            { id: 'material', label: 'Made of', pattern: '{noun} made of {}' },
            { id: 'use', label: 'For', pattern: '{noun} for {}' },
            { id: 'size', label: 'Size', pattern: '{} {noun}' },
          ],
        },
        // prettier-ignore
        [
          ['Trowel', '🥄', 'steel', 'digging', 'small', 'Lost twice a season and found each time in the compost.'],
          ['Shears', '✂️', 'steel', 'cutting', 'big', 'Sharpened every spring by a man who charges too much.'],
          ['Dibber', '🪵', 'wood', 'digging', 'small', 'A stick with ambitions. Makes a hole exactly one seed deep.'],
          ['Rake', '🍂', 'steel', 'sorting', 'big', 'Stood on once a year, to everyone else’s delight.'],
          ['Sprayer', '💦', 'plastic', 'watering', 'small', 'Half water, half seaweed feed, entirely mysterious to visitors.'],
          ['Gloves', '🧤', 'leather', 'digging', 'small', 'One is missing. It has been missing since the spring.'],
          ['Hoe', '⛏️', 'steel', 'digging', 'big', 'Removes weeds and, occasionally, an entire row of seedlings.'],
          ['Twine', '🧵', 'jute', 'sorting', 'small', 'Ties everything. Has tied things that were never meant to be tied.'],
          ['Secateurs', '✂️', 'steel', 'cutting', 'small', 'The only tool nobody is allowed to borrow.'],
          ['Kneeler', '🧎', 'plastic', 'sorting', 'big', 'The single most sensible purchase on the entire allotment.'],
          ['Sieve', '🕸️', 'steel', 'sorting', 'big', 'Turns lumpy compost into something worth putting seeds in.'],
          ['Hand Fork', '🍴', 'steel', 'digging', 'small', 'Bent on a stone in 2019 and never quite the same.'],
          ['Watering Can', '🚿', 'metal', 'watering', 'big', 'Nine litres, one dodgy handle, and a rose that has never come off.'],
          ['Plant Labels', '🏷️', 'plastic', 'sorting', 'small', 'Written in pencil, faded by June, argued about in July.'],
        ],
      ),
      scale({
        id: 'height',
        name: 'Height',
        pattern: 'the {} plant',
        describes: 'the {}',
        noun: 'plant',
        start: 20,
        step: 15,
        count: 14,
        format: (value) => `${value}cm`,
        bands: ['low', 'middling', 'towering'],
        bandLabel: 'Stature',
        parityPattern: '{noun} at an {} height',
        icons: ['🌱', '🌿', '🌳'],
        // prettier-ignore
        blurbs: [
          'A {} entry. Judged from a crouch, which nobody enjoys.',
          'A {} entry. Small, tidy, and quietly perfect.',
          'A {} entry. Grown in a windowsill pot and dared to enter.',
          'A {} entry. Exactly the height the schedule recommends.',
          'A {} entry. Staked once, as a precaution, and never needed it.',
          'A {} entry. Stood in the front row and looked entirely at home.',
          'A {} entry. Fed weekly with something the owner will not name.',
          'A {} entry. Blocked the view of three other entries.',
          'A {} entry. Carried in by two people and a wheelbarrow.',
          'A {} entry. Needed a cane, then a second cane, then a rethink.',
          'A {} entry. Grew through the greenhouse roof in early July.',
          'A {} entry. Measured twice because the first time was disputed.',
          'A {} entry. Visible from the car park, which is the real prize.',
          'A {} entry. The tallest since the famous sunflower business.',
        ],
        ordered: {
          noun: 'plant height',
          unit: 'centimetres',
          greater: 'taller',
          lesser: 'shorter',
        },
      }),
    ],
    clues: {
      link: '{a} and {b} are the same entry.',
      notLink: '{a} and {b} are different entries.',
      groupNot: 'No {a} is the same entry as {b}.',
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
