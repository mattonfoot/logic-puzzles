/**
 * People, as head and shoulders.
 *
 * Three things change: what is on the shoulders, which is the same across a
 * theme and different between them, and then **two independent things about the
 * head** — the hair and one distinguishing feature. Twelve hairs against eight
 * features is ninety-six outlines to draw fourteen people from, which is what
 * keeps a set of them apart at the size a grid heading gets.
 *
 * Both of those are traits the player can read on the item's card, and that is
 * the point of them. Before this the cards described people by hair *colour*,
 * eye colour and star sign — not one of which a filled outline can show, so
 * what a clue said about somebody and what their picture showed had nothing to
 * do with each other. Hair is a style now, and the feature is something that
 * breaks the head's outline, so both are things a silhouette can actually say.
 *
 * Only shapes that change the outline are worth drawing here. A scar, a colour,
 * a pair of tinted lenses — all invisible in a shape filled with one colour, so
 * every feature below sticks out past the head somewhere.
 */
import {
  around,
  band,
  bar,
  circle,
  dome,
  ellipse,
  hole,
  poly,
  rect,
  stroke,
  turn,
  wedge,
} from './draw.mjs';

const HEAD = { x: 50, y: 36, r: 17 };

/** Shoulders, and whatever a theme wears on them. */
const WEAR = {
  // A pressure collar, squared off at the neck.
  cosmic: () => [
    poly([
      [16, 96],
      [20, 72],
      [36, 64],
      [64, 64],
      [80, 72],
      [84, 96],
    ]),
    rect(34, 58, 32, 8, 2),
  ],
  // Nothing at all: a person in a café is just a person.
  cafe: () => [
    poly([
      [17, 96],
      [22, 74],
      [38, 65],
      [62, 65],
      [78, 74],
      [83, 96],
    ]),
  ],
  // Pauldrons.
  quest: () => [
    poly([
      [18, 96],
      [24, 74],
      [38, 66],
      [62, 66],
      [76, 74],
      [82, 96],
    ]),
    ellipse(23, 76, 10, 8),
    ellipse(77, 76, 10, 8),
  ],
  // A wetsuit collar, high at the neck.
  reef: () => [
    poly([
      [18, 96],
      [22, 74],
      [38, 64],
      [62, 64],
      [78, 74],
      [82, 96],
    ]),
    band(50, 62, 13, 7, 200, 340),
  ],
  // A collar with a notch cut for the buttons.
  garden: () => [
    poly([
      [17, 96],
      [22, 74],
      [40, 66],
      [50, 78],
      [60, 66],
      [78, 74],
      [83, 96],
    ]),
  ],
};

const { x: hx, y: hy, r: hr } = HEAD;

/**
 * What each person has on their head.
 *
 * A silhouette only shows an outline, so every style has to change the shape of
 * the head itself — a bigger dome, a squarer one, a scalloped one, or something
 * that sticks out past it. Hair that only sat on top would be invisible.
 */
export const HAIR = {
  bald: () => [],
  short: () => [dome(hx, hy - 2, hr + 4, 215)],
  crop: () => [
    poly([
      [hx - hr - 3, hy + 2],
      [hx - hr - 3, hy - hr - 1],
      [hx + hr + 3, hy - hr - 1],
      [hx + hr + 3, hy + 2],
    ]),
  ],
  bun: () => [dome(hx, hy - 2, hr + 3, 215), circle(hx + 13, hy - 16, 7)],
  topknot: () => [
    dome(hx, hy - 2, hr + 3, 215),
    bar([hx, hy - 18], [hx, hy - 26], 5),
    circle(hx, hy - 28, 6),
  ],
  ponytail: () => [
    dome(hx, hy - 2, hr + 3, 215),
    wedge([hx + 12, hy - 10], [hx + 30, hy + 20], 13),
  ],
  long: () => [
    dome(hx, hy - 2, hr + 4, 200),
    rect(hx - hr - 8, hy - 8, 9, 34, 4),
    rect(hx + hr - 1, hy - 8, 9, 34, 4),
  ],
  bob: () => [dome(hx, hy - 2, hr + 6, 195), rect(hx - hr - 6, hy - 6, (hr + 6) * 2, 22, 9)],
  curls: () => [
    circle(hx, hy - 3, hr + 1),
    ...around(hx, hy - 3, 7, (angle) => {
      const [x, y] = turn([hx, hy - 3 - (hr + 1)], [hx, hy - 3], angle);
      return angle > 200 || angle < 160 ? circle(x, y, 5) : null;
    }),
  ],
  afro: () => [circle(hx, hy - 4, hr + 6)],
  braids: () => [
    dome(hx, hy - 2, hr + 3, 215),
    wedge([hx - 14, hy - 8], [hx - 26, hy + 24], 11),
    wedge([hx + 14, hy - 8], [hx + 26, hy + 24], 11),
  ],
  mohawk: () => [
    dome(hx, hy - 1, hr + 1, 210),
    poly([
      [hx - 10, hy - 16],
      [hx - 5, hy - 32],
      [hx + 3, hy - 32],
      [hx + 9, hy - 15],
    ]),
  ],
};

/**
 * The one thing about a face worth drawing, per person.
 *
 * Every one of these breaks the head's outline somewhere — a bar past the
 * cheeks, a ring below the ear, a cup over one side — because that is the only
 * kind of detail a filled shape can carry. Between them and the hair above,
 * fourteen people in a set are fourteen different outlines rather than fourteen
 * heads with different colouring nobody can see.
 */
export const FEATURE = {
  // Wider than the jaw rather than longer than it: a beard that only hangs down
  // runs into the collar and disappears, where one that spreads past the cheeks
  // is still a beard at the size of a grid heading.
  beard: () => [
    poly([
      [hx - hr - 5, hy],
      [hx + hr + 5, hy],
      [hx + hr - 1, hy + 18],
      [hx, hy + 26],
      [hx - hr + 1, hy + 18],
    ]),
  ],
  moustache: () => [
    poly([
      [hx - hr - 8, hy + 5],
      [hx - 4, hy + 3],
      [hx + 4, hy + 3],
      [hx + hr + 8, hy + 5],
      [hx + hr + 4, hy + 13],
      [hx, hy + 10],
      [hx - hr - 4, hy + 13],
    ]),
  ],
  // Rings rather than discs: two filled circles at eye level would only widen
  // the head, where a lens with the middle cut out reads as a lens. Drawn big
  // enough to clear a dome of hair, since most of the set has some.
  spectacles: () => [
    circle(hx - 14, hy + 1, 13),
    hole.circle(hx - 14, hy + 1, 7.5),
    circle(hx + 14, hy + 1, 13),
    hole.circle(hx + 14, hy + 1, 7.5),
    rect(hx - 5, hy - 1, 10, 4, 2),
  ],
  earrings: () => [
    circle(hx - hr + 1, hy + 15, 7),
    hole.circle(hx - hr + 1, hy + 15, 3.5),
    circle(hx + hr - 1, hy + 15, 7),
    hole.circle(hx + hr - 1, hy + 15, 3.5),
  ],
  chops: () => [
    poly([
      [hx - hr + 4, hy - 6],
      [hx - hr - 2, hy - 4],
      [hx - hr - 8, hy + 14],
      [hx - hr + 6, hy + 12],
    ]),
    poly([
      [hx + hr - 4, hy - 6],
      [hx + hr + 2, hy - 4],
      [hx + hr + 8, hy + 14],
      [hx + hr - 6, hy + 12],
    ]),
  ],
  // One side only: an outline that is not symmetrical is the easiest of all to
  // pick out of a row of headings.
  eyepatch: () => [
    poly([
      [hx + 1, hy - 11],
      [hx + hr + 10, hy - 15],
      [hx + hr + 10, hy + 2],
      [hx + 1, hy + 4],
    ]),
    bar([hx - hr - 6, hy - 15], [hx + hr + 6, hy - 8], 4),
  ],
  // Read mostly by the boom, which hangs out into clear space below the ear
  // where no hair reaches.
  headset: () => [
    band(hx, hy - 2, hr + 8, 5, 200, 340),
    circle(hx - hr - 6, hy + 1, 7),
    ...stroke(
      [
        [hx - hr - 6, hy + 4],
        [hx - 7, hy + 17],
      ],
      3.5,
    ),
    circle(hx - 6, hy + 18, 4),
  ],
  chinstrap: () => [band(hx, hy + 1, hr + 6, 4.5, 20, 160)],
};
/**
 * What the reference locale says, and the shape each phrase draws as.
 *
 * The drawings are keyed to `locales/en-GB.yaml` — the file the icons are built
 * from — rather than hand-listed against each person, so a hair or a feature
 * written on somebody's card is the one their picture shows, and cannot drift
 * from it. A phrase with nothing behind it stops the build rather than quietly
 * drawing a bald stranger.
 */
const HAIR_SAID = {
  'a shaved head': 'bald',
  'a crop': 'crop',
  'short hair': 'short',
  'long hair': 'long',
  'a bob': 'bob',
  'a bun': 'bun',
  'a topknot': 'topknot',
  'a ponytail': 'ponytail',
  braids: 'braids',
  curls: 'curls',
  'an afro': 'afro',
  'a mohawk': 'mohawk',
};

const FEATURE_SAID = {
  'a beard': 'beard',
  'a moustache': 'moustache',
  spectacles: 'spectacles',
  'hoop earrings': 'earrings',
  'mutton chops': 'chops',
  'an eye patch': 'eyepatch',
  'a headset': 'headset',
  'a chinstrap': 'chinstrap',
};

/** A person: shoulders, neck, head, their hair and their one feature. */
export function person(theme, hairSaid, featureSaid) {
  const hair = HAIR[HAIR_SAID[hairSaid]];
  if (!hair) throw new Error(`Nothing draws the hair "${hairSaid}"`);
  const feature = FEATURE[FEATURE_SAID[featureSaid]];
  if (!feature) throw new Error(`Nothing draws the feature "${featureSaid}"`);
  return [
    WEAR[theme](),
    ...stroke(
      [
        [hx, hy + 10],
        [hx, hy + 24],
      ],
      14,
    ),
    circle(hx, hy, hr),
    hair(),
    feature(),
  ];
}
