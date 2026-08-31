/**
 * People, in profile.
 *
 * Three things change: what is on the shoulders, which is the same across a
 * theme and different between them, and then **two independent things about the
 * head** — the hair and one distinguishing feature, both of which are traits the
 * player can read on the person's card. Twelve hairs against eight features is
 * ninety-six outlines to draw fourteen people from.
 *
 * **Why a profile and not a face.** A silhouette is an outline and nothing else,
 * and a head drawn face-on is a circle: the only thing that can vary is what
 * sticks out past the edge of it, so every person ends up as the same disc with
 * a different bump. Turn the head side-on and the whole front of it becomes
 * outline — brow, nose, lip, chin — and everything a person wears lands where it
 * can be seen. A moustache sits out in front of the mouth instead of hiding
 * inside the face. Spectacles have a lens on the nose and an arm running back to
 * the ear. A headset gets a boom. A beard changes the shape of the jaw rather
 * than adding a blob under it. This is why portrait silhouettes have been cut in
 * profile for three hundred years, and it is the whole reason a set of fourteen
 * can be told apart at the size of a grid heading.
 *
 * Everybody faces the same way — right — so a row of headings reads as a row of
 * people rather than a crowd looking at each other, and so the ear, the eye and
 * the jaw are in the same place in every drawing for the hair and the features to
 * be built against.
 *
 * The construction below is a real one: a cranium, a face line with a brow, a
 * nose and a chin, a jaw hinged under the ear, and a neck that meets the
 * shoulders where a neck does. Everything else is positioned off the landmarks
 * rather than by eye, so a new hair or a new feature lands in the right place
 * without being nudged into it.
 */
import { band, bar, circle, ellipse, hole, poly, rect, stroke, wedge } from './draw.mjs';

/**
 * The landmarks every other shape here is measured from.
 *
 * `EAR` is where a hoop hangs, a spectacle arm ends and a headset cup sits;
 * `EYE` carries the lens and the patch; `NOSE` and `MOUTH` place a moustache;
 * `CHIN` and `JAW` shape a beard. Nothing below uses a bare number where one of
 * these would do.
 */
const CROWN = [46, 9];
const BROW = [66, 31];
const NASION = [63, 38];
const NOSE = [71, 48];
const MOUTH = [63, 55];
const CHIN = [65, 63];
const EAR = [40, 44];
const NAPE = [34, 68];

/**
 * The skull, from the hairline round the back to the nape.
 *
 * Every hair below is this outline pushed outwards from the middle of the
 * cranium, which is the one thing that makes a hairline work: grow the shape and
 * it stays outside the head at every point, so the union of the two has no step
 * in it. Drawing each cap freehand put its front edge *inside* the forehead
 * somewhere, and the head then poked through as a shelf above the brow.
 */
const SKULL = [
  [67, 25],
  [62, 14],
  [52, 7],
  [40, 9],
  [29, 18],
  [22, 32],
  [22, 46],
  [27, 58],
];
const MIDDLE = [45, 32];

/** The skull grown by a fraction of itself, about the middle of the cranium. */
const grow = (by) =>
  SKULL.map(([x, y]) => [MIDDLE[0] + (x - MIDDLE[0]) * by, MIDDLE[1] + (y - MIDDLE[1]) * by]);

/**
 * The head and neck, side-on, as one shape.
 *
 * Built to the proportions a portrait is: the crown at 10 and the bottom of the
 * chin at 71, and — nose included — very nearly as deep as it is tall; the eyes
 * on the halfway line; the brow, the base of the nose and the chin cutting the
 * face into three. The ear sits where a profile puts it, behind the middle and
 * between the brow and the base of the nose, which is what every feature below
 * hangs off.
 *
 * Two things about the face line are the difference between a profile and a
 * duck. The nose has to come down as it comes back — a nose whose underside is
 * horizontal reads as an open beak with the lip below it. And the lips move by
 * two or three units, not six: past that they stop being lips and serrate into
 * teeth. Only the nose is allowed to be a spike.
 *
 * The jaw is deliberately not on the outline either. In profile it runs back
 * *inside* the head to the ear, and what the edge does is fall from the chin to
 * the throat; draw the jaw's underside and the chin gets a shelf under it. Head
 * and neck are one polygon for the same reason — two shapes meeting at the
 * throat leave a seam, and a seam at twenty pixels is a notch.
 */
function head() {
  return [
    poly([
      CROWN,
      [53, 11],
      [59, 15],
      [63, 20],
      [65, 26],
      BROW,
      NASION,
      [66, 43],
      NOSE,
      [67, 50],
      [64, 52],
      MOUTH,
      [64, 59],
      CHIN,
      [62, 67],
      [58, 73],
      [56, 80],
      [56, 90],
      [37, 90],
      [36, 77],
      NAPE,
      [30, 61],
      [26, 53],
      [23, 44],
      [23, 34],
      [26, 24],
      [32, 15],
      [39, 11],
    ]),
  ];
}

/**
 * Shoulders, and what a theme wears on them.
 *
 * Drawn as a bust rather than a pair of shoulders: the chest is forward of the
 * back because the person is turned, and a symmetrical trapezoid under a turned
 * head reads as a mistake.
 */
const WEAR = {
  // A pressure collar with a squared seal at the throat.
  cosmic: () => [
    poly([
      [8, 100],
      [16, 80],
      [34, 72],
      [64, 72],
      [84, 80],
      [92, 100],
    ]),
    poly([
      [33, 80],
      [37, 71],
      [62, 71],
      [66, 80],
    ]),
    bar([31, 73], [68, 73], 5),
  ],
  // Nothing at all: a person in a café is just a person.
  cafe: () => [
    poly([
      [8, 100],
      [16, 80],
      [35, 73],
      [63, 73],
      [84, 80],
      [92, 100],
    ]),
    poly([
      [40, 80],
      [51, 93],
      [61, 80],
    ]),
  ],
  // A pauldron over the near shoulder, and a cloak clasp at the throat.
  quest: () => [
    poly([
      [8, 100],
      [16, 80],
      [34, 72],
      [64, 72],
      [84, 80],
      [92, 100],
    ]),
    ellipse(23, 86, 14, 10),
    ellipse(23, 94, 15, 8),
    circle(58, 82, 6),
  ],
  // A wetsuit collar, rolled high at the throat.
  reef: () => [
    poly([
      [8, 100],
      [16, 80],
      [34, 72],
      [64, 72],
      [84, 80],
      [92, 100],
    ]),
    band(49, 72, 15, 8, 15, 165),
    poly([
      [46, 80],
      [60, 80],
      [58, 100],
      [44, 100],
    ]),
  ],
  // An open collar with the lapel turned back.
  garden: () => [
    poly([
      [8, 100],
      [16, 80],
      [35, 73],
      [63, 73],
      [84, 80],
      [92, 100],
    ]),
    poly([
      [34, 80],
      [49, 80],
      [45, 98],
      [30, 88],
    ]),
    poly([
      [53, 80],
      [66, 82],
      [61, 94],
      [51, 92],
    ]),
  ],
};

/**
 * Twelve ways of wearing hair, in profile.
 *
 * Each is one **solid mass** over the skull rather than a band following it. In
 * a drawing of a single colour the inside of the hair and the inside of the head
 * are the same thing, so a band buys nothing and costs a hairline sliver that
 * breaks up at small sizes; the mass is closed off with a chord straight through
 * the skull, where nobody can see it. What is left to draw is the only part that
 * matters — the outline, and where it ends at the back.
 *
 * That back edge is where nearly all of the difference between one style and the
 * next lives. A bob stops at the jaw with a squared edge, a ponytail leaves the
 * skull and falls, a bun is a knot behind the ear, a mohawk is a crest with the
 * sides shaved to nothing. Read as a row, they are twelve shapes rather than
 * twelve domes.
 */
/** A mass of hair: the grown skull, plus whatever falls behind it. */
const cap = (by, fall = []) => poly([...grow(by), ...fall]);

export const HAIR = {
  bald: () => [],
  crop: () => [cap(1.05)],
  short: () => [cap(1.12)],
  long: () => [
    cap(1.13, [
      [22, 74],
      [17, 96],
      [33, 98],
      [37, 74],
    ]),
  ],
  bob: () => [
    cap(1.16, [
      [20, 72],
      [39, 74],
      [37, 56],
    ]),
  ],
  bun: () => [cap(1.08), circle(14, 34, 12), rect(18, 26, 14, 16, 4)],
  topknot: () => [
    cap(1.08),
    ...stroke(
      [
        [43, 10],
        [40, 1],
      ],
      6,
    ),
    circle(39, -1, 8),
  ],
  ponytail: () => [cap(1.08), wedge([24, 28], [1, 58], 18)],
  braids: () => [cap(1.08), wedge([23, 34], [4, 84], 13), wedge([30, 42], [19, 94], 12)],
  curls: () => [
    cap(1.12),
    circle(26, 16, 12),
    circle(43, 6, 13),
    circle(58, 14, 11),
    circle(16, 32, 12),
    circle(19, 50, 11),
  ],
  afro: () => [circle(40, 26, 30)],
  // Shaved at the sides, so the skull is the outline everywhere but the crest.
  mohawk: () => [
    poly([
      [30, 18],
      [37, -4],
      [52, -8],
      [63, 3],
      [67, 24],
      [58, 14],
      [45, 8],
      [34, 15],
    ]),
  ],
};

/**
 * The one thing about a face worth drawing, per person.
 *
 * In profile these stop being bumps on a disc and become what they actually
 * are — a lens on the eye with an arm back to the ear, a boom out in front of
 * the mouth, a jaw filled in with beard. Each is measured off the landmarks
 * above, so it lands right under any of the twelve hairs.
 *
 * Every one of them has to break the outline somewhere, and in profile that
 * rules more out than it looks like it would. Anything held *inside* the head —
 * an earring on a lobe that a profile puts in the middle of the head, a ring
 * punched as a void — is swallowed: the head is filled underneath it, and one
 * shape over another in a single colour is one shape. So the eight below all
 * work at an edge: the brow, the eye, the mouth, the jaw, the crown, the
 * throat.
 */
export const FEATURE = {
  beard: () => [
    poly([
      [37, 36],
      [47, 42],
      [55, 60],
      [64, 62],
      [76, 68],
      [71, 79],
      [56, 84],
      [42, 76],
      [32, 54],
    ]),
  ],
  moustache: () => [
    poly([
      [57, 51],
      [66, 50],
      [79, 54],
      [75, 61],
      [66, 57],
      [56, 58],
    ]),
  ],
  spectacles: () => [
    circle(65, 43, 11),
    hole.circle(65, 43, 6.5),
    bar([58, 40], [EAR[0], EAR[1] - 2], 4),
  ],
  // Round the forehead and out past the back of the skull: the one place left
  // on a head that the hair does not already own.
  headband: () => [
    bar([19, 28], [70, 26], 8),
    poly([
      [22, 24],
      [22, 34],
      [12, 38],
      [11, 27],
    ]),
  ],
  chops: () => [
    poly([
      [34, 32],
      [46, 39],
      [52, 62],
      [41, 68],
      [30, 54],
    ]),
  ],
  // The strap is the giveaway: a band right round the head, above the ear and
  // out past the back of the skull.
  eyepatch: () => [
    poly([
      [52, 34],
      [70, 36],
      [71, 49],
      [53, 47],
    ]),
    bar([19, 36], [69, 32], 5),
  ],
  headset: () => [
    band(42, 42, 31, 6, 200, 300),
    ellipse(EAR[0], EAR[1] + 2, 9, 13),
    ...stroke(
      [
        [EAR[0] + 3, EAR[1] + 13],
        [55, 65],
        [74, 60],
      ],
      3.5,
    ),
    circle(76, 59, 5),
  ],
  chinstrap: () => [
    ...stroke(
      [
        [EAR[0] - 2, EAR[1] + 6],
        [48, 74],
        [66, 66],
      ],
      6,
    ),
  ],
};

/**
 * What the reference locale says, and the shape each phrase draws as.
 *
 * The drawings are keyed to `locales/en-HB.yaml` — the file the icons are built
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
  'a headband': 'headband',
  'mutton chops': 'chops',
  'an eye patch': 'eyepatch',
  'a headset': 'headset',
  'a chinstrap': 'chinstrap',
};

/**
 * A person: shoulders, neck, head, their hair and their one feature.
 *
 * Drawn back to front, the way a portrait is built up — anything that belongs
 * behind the head (a plait, a bun, the fall of long hair) is in the hair's own
 * shape rather than in a separate layer, because there is only one colour and
 * behind and in front look the same in it.
 */
export function person(theme, hairSaid, featureSaid) {
  const hair = HAIR[HAIR_SAID[hairSaid]];
  if (!hair) throw new Error(`Nothing draws the hair "${hairSaid}"`);
  const feature = FEATURE[FEATURE_SAID[featureSaid]];
  if (!feature) throw new Error(`Nothing draws the feature "${featureSaid}"`);
  return [WEAR[theme](), head(), hair(), feature()];
}
