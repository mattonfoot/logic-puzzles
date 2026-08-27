/**
 * People, as head and shoulders.
 *
 * One silhouette with two things changed: what is on the head, which is
 * different for every person in a theme, and what is on the shoulders, which is
 * the same across a theme and different between them. So no two people in the
 * app share an outline.
 */
import {
  around,
  band,
  bar,
  circle,
  dome,
  ellipse,
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
    circle(hx, hy - 3, hr + 3),
    ...around(hx, hy - 3, 7, (angle) => {
      const [x, y] = turn([hx, hy - 3 - (hr + 3)], [hx, hy - 3], angle);
      return angle > 200 || angle < 160 ? circle(x, y, 6) : null;
    }),
  ],
  afro: () => [circle(hx, hy - 5, hr + 8)],
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
  cap: () => [
    dome(hx, hy - 3, hr + 3, 205),
    poly([
      [hx + 2, hy - 8],
      [hx + 32, hy - 5],
      [hx + 32, hy + 1],
      [hx + 2, hy - 1],
    ]),
  ],
  hood: () => [
    poly([
      [hx - hr - 9, hy + 18],
      [hx - hr - 7, hy - 10],
      [hx, hy - hr - 12],
      [hx + hr + 7, hy - 10],
      [hx + hr + 9, hy + 18],
      [hx + hr - 2, hy + 13],
      [hx - hr + 2, hy + 13],
    ]),
  ],
  scarf: () => [
    dome(hx, hy - 3, hr + 4, 215),
    poly([
      [hx - hr - 4, hy - 4],
      [hx + hr + 4, hy - 4],
      [hx + hr + 2, hy + 26],
      [hx - hr - 2, hy + 26],
    ]),
  ],
  beard: () => [
    dome(hx, hy - 2, hr + 3, 215),
    poly([
      [hx - hr - 1, hy + 2],
      [hx + hr + 1, hy + 2],
      [hx + hr - 2, hy + 22],
      [hx, hy + 30],
      [hx - hr + 2, hy + 22],
    ]),
  ],
  brim: () => [dome(hx, hy - 6, hr, 200), ellipse(hx, hy - 6, hr + 14, 5)],
  visor: () => [dome(hx, hy - 4, hr + 3, 200), rect(hx - hr - 9, hy - 8, (hr + 9) * 2, 8, 4)],
};

/** A person: shoulders, neck, head, and whatever is on it. */
export function person(theme, hair) {
  const style = HAIR[hair];
  if (!style) throw new Error(`No hair called ${hair}`);
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
    style(),
  ];
}
