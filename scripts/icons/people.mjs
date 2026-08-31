/**
 * People, as pictograms.
 *
 * A person is a **head, filling the box**, and nothing else: no neck, no
 * shoulders, no collar. What varies is the hair and one distinguishing feature,
 * and both are drawn as large and as plainly as the box allows.
 *
 * **Why there is no body.** These were busts, and the bust was the problem. Head
 * and neck and shoulders were identical for all fourteen people in a set and
 * took up three-fifths of the drawing, so the two things that actually told one
 * person from another were fighting for the remaining two-fifths — and losing it
 * at the size a grid heading gets. Throwing the body away does two things at
 * once: the head grows to fill the space it leaves, so the hair and the feature
 * are drawn getting on for twice the size, and the share of the drawing that
 * varies at all goes from about a sixth to about a third. That second number is
 * the one that matters. A pictogram is not a small portrait; it is a shape whose
 * whole job is to be told apart from the shape beside it.
 *
 * Nothing is lost by dropping the collar that used to say which theme a person
 * belonged to. Every person on a board comes from the same theme, and the theme
 * is named across the top of the screen.
 *
 * **Why a profile and not a face.** A silhouette is an outline and nothing else,
 * and a head drawn face-on is a circle: the only thing that can vary is what
 * sticks out past the edge of it. Turn the head side-on and the whole front of
 * it becomes outline — brow, nose, chin — and everything a person wears lands
 * where it can be seen. A moustache sits out in front of the mouth instead of
 * hiding inside the face. Spectacles get a lens on the eye and an arm back to
 * the ear. A headset gets a boom. A beard changes the shape of the jaw.
 *
 * Everybody faces the same way — right — so a row of headings reads as a row of
 * people rather than a crowd looking at each other, and so the ear, the eye and
 * the jaw are in the same place in every drawing for the hair and the features
 * to be built against.
 *
 * The forms are deliberately blunt. A pictogram of a head is not an anatomy
 * drawing: one rounded cranium, one wedge of a nose, one chin, and no detail
 * that would survive being shrunk to twenty-four points anyway.
 */
import { band, bar, circle, hole, poly, stroke, wedge } from './draw.mjs';

/**
 * The landmarks every other shape here is measured from.
 *
 * `EAR` is where a spectacle arm ends and a headset cup sits; `EYE` carries the
 * lens and the patch; `NOSE` and `MOUTH` place a moustache; `CHIN` and `JAW`
 * shape a beard and a chinstrap. Nothing below uses a bare number where one of
 * these would do.
 */
const CROWN = [40, 18];
const BROW = [69, 39];
const NASION = [64, 48];
const NOSE = [88, 61];
const MOUTH = [70, 74];
const CHIN = [76, 83];
const JAW = [42, 93];
const EAR = [32, 58];

/**
 * The skull, from the hairline at the forehead round the back to the nape.
 *
 * Every hair below is this outline pushed outwards from the middle of the
 * cranium, which is the one thing that makes a hairline work: grow the shape and
 * it stays outside the head at every point, so the union of the two has no step
 * in it. Drawing each cap freehand puts its front edge *inside* the forehead
 * somewhere, and the head then pokes through as a shelf above the brow.
 *
 * The cranium is deliberately small in the box and set back to the left. The
 * hair fills the space behind and above it and the face fills the space in
 * front, and neither has to fight the other for room. A head sized to fill the
 * box on its own leaves the hair nowhere to be: grown five per cent or twenty it
 * lands in the same place, and twelve styles collapse into one blob.
 */
const SKULL = [
  [68, 37],
  [58, 23],
  [42, 17],
  [26, 21],
  [14, 34],
  [8, 52],
  [10, 69],
  [18, 82],
];
const MIDDLE = [38, 50];

/** The skull grown by a fraction of itself, about the middle of the cranium. */
const grow = (by) =>
  SKULL.map(([x, y]) => [MIDDLE[0] + (x - MIDDLE[0]) * by, MIDDLE[1] + (y - MIDDLE[1]) * by]);

/**
 * The head, side-on, chin to crown and nothing below it.
 *
 * Drawn as a caricature rather than a portrait, because that is what a pictogram
 * is: take the thing that identifies the shape and overdraw it. The nose here
 * projects a quarter of the width of the box and tucks hard back underneath, and
 * the chin comes forward to meet it. A correctly proportioned profile at
 * twenty-four points is a blob with a bump; an exaggerated one is a face.
 *
 * The one rule that has to hold is that the nose comes *down* as it comes back —
 * a nose with a horizontal underside reads as an open beak. Everything else is
 * left out. No lips, no philtrum, no brow ridge: each is a two-unit wobble that
 * turns into a serration at the size this is actually looked at, and a pictogram
 * earns nothing by carrying detail it cannot show.
 */
export function head() {
  return [
    poly([
      CROWN,
      [54, 20],
      [63, 28],
      BROW,
      NASION,
      NOSE,
      [66, 67],
      MOUTH,
      CHIN,
      [64, 92],
      JAW,
      [26, 91],
      [16, 81],
      [10, 65],
      [10, 45],
      [18, 27],
      [28, 19],
    ]),
  ];
}

/**
 * Twelve ways of wearing hair.
 *
 * Each is one **solid mass** over the skull rather than a band following it. In
 * a drawing of a single colour the inside of the hair and the inside of the head
 * are the same thing, so a band buys nothing and costs a hairline sliver that
 * breaks up at small sizes; the mass is closed off with a chord straight through
 * the skull, where nobody can see it. What is left to draw is the only part that
 * matters — the outline, and where it ends at the back.
 *
 * Told apart by the *shape and the size* of that mass, not by texture. A crop
 * barely leaves the skull; a bob is a squared block down to the jaw; a bun is a
 * ball behind the head; an afro is a circle half again as wide as the head it is
 * on; a mohawk shaves the sides to nothing and puts a fin on top; a ponytail
 * leaves the skull and falls out of the box. Between the smallest and the
 * largest there is nearly twice the ink, which is a difference that survives
 * being shrunk to a grid heading when a change of texture would not.
 */
const cap = (by, fall = []) => poly([...grow(by), ...fall]);

export const HAIR = {
  bald: () => [],
  crop: () => [cap(1.06)],
  short: () => [cap(1.18)],
  long: () => [
    cap(1.2, [
      [4, 82],
      [2, 100],
      [26, 100],
      [28, 80],
    ]),
  ],
  bob: () => [
    cap(1.24, [
      [1, 80],
      [29, 86],
      [26, 58],
    ]),
  ],
  // A knot at the back of the crown, clear of the cap on two sides.
  bun: () => [cap(1.08), circle(15, 17, 14)],
  topknot: () => [
    cap(1.08),
    ...stroke(
      [
        [32, 20],
        [26, 10],
      ],
      10,
    ),
    circle(23, 7, 13),
  ],
  ponytail: () => [cap(1.08), wedge([19, 34], [3, 86], 30)],
  braids: () => [cap(1.08), wedge([12, 44], [0, 98], 20), wedge([21, 56], [16, 100], 17)],
  curls: () => [
    cap(1.12),
    circle(18, 18, 16),
    circle(40, 8, 17),
    circle(58, 17, 14),
    circle(15, 40, 15),
    circle(16, 66, 14),
  ],
  afro: () => [circle(42, 50, 40)],
  // Shaved at the sides, so the skull is the outline everywhere but the crest.
  mohawk: () => [
    poly([
      [20, 34],
      [30, 2],
      [50, 0],
      [66, 14],
      [66, 40],
      [42, 22],
    ]),
  ],
};

/**
 * The one distinguishing feature, drawn at pictogram scale.
 *
 * Every one of these has to break the outline somewhere, because anything held
 * inside the head is swallowed — a ring punched as a void included: the head is
 * filled underneath it, and one shape over another in a single colour is one
 * shape. That is the rule that decides what can be on this list at all. It is
 * why there are no hoop earrings on it (a profile puts the ear in the middle of
 * the head, so a hoop hangs over the jaw where nothing can see it) and why the
 * eighth is a headband, which goes round the forehead and out past the back of
 * the skull — the one place on a head the hair does not already own.
 */
export const FEATURE = {
  beard: () => [
    poly([
      [28, 50],
      [44, 62],
      [54, 80],
      [70, 78],
      [92, 86],
      [80, 100],
      [46, 100],
      [24, 90],
      [18, 66],
    ]),
  ],
  moustache: () => [
    poly([
      [54, 66],
      [70, 63],
      [95, 70],
      [88, 84],
      [70, 76],
      [52, 78],
    ]),
  ],
  // A lens straddling the face line, and an arm that runs back and out past the
  // skull. The arm is what stops it reading as a handle on a jug.
  spectacles: () => [circle(68, 52, 14), hole.circle(68, 52, 8), bar([60, 48], [1, 54], 6)],
  // Round the forehead and out past the back of the skull.
  headband: () => [
    bar([1, 40], [78, 34], 12),
    poly([
      [10, 32],
      [8, 50],
      [0, 58],
      [0, 32],
    ]),
  ],
  chops: () => [
    poly([
      [22, 40],
      [42, 50],
      [50, 84],
      [32, 94],
      [14, 74],
    ]),
  ],
  // One side only, and the strap runs right round the head: an outline that is
  // not symmetrical is the easiest of all to pick out of a row of headings.
  eyepatch: () => [
    poly([
      [52, 40],
      [82, 44],
      [84, 66],
      [54, 62],
    ]),
    bar([3, 47], [78, 40], 9),
  ],
  headset: () => [
    band(42, 54, 34, 12, 196, 300),
    circle(EAR[0] - 10, EAR[1] + 2, 17),
    ...stroke(
      [
        [24, 72],
        [50, 94],
        [84, 86],
      ],
      8,
    ),
    circle(88, 84, 10),
  ],
  // Under the jaw and up in front of the ear, so it breaks the outline at the
  // bottom where nothing else does.
  chinstrap: () => [
    ...stroke(
      [
        [20, 62],
        [44, 100],
        [82, 88],
      ],
      12,
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
 * A person: a head, their hair, and their one feature.
 *
 * The theme is no longer an argument — there is no collar to change. It stays in
 * the signature because every caller passes it and the day a theme wants its own
 * head shape, this is where it goes.
 */
export function person(theme, hairSaid, featureSaid) {
  const hair = HAIR[HAIR_SAID[hairSaid]];
  if (!hair) throw new Error(`Nothing draws the hair "${hairSaid}"`);
  const feature = FEATURE[FEATURE_SAID[featureSaid]];
  if (!feature) throw new Error(`Nothing draws the feature "${featureSaid}"`);
  return [head(), hair(), feature()];
}
