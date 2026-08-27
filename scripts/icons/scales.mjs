/**
 * The ordered categories: fourteen rungs of one ladder.
 *
 * Each has a motif that grows with the number, so the icons are unique the way
 * the numbers are — a taller plant, a deeper weight, a longer trail — and a
 * player can see at a glance which end of the scale they are looking at.
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
  star,
  stroke,
  wedge,
} from './draw.mjs';

const rungs = (labels, make) =>
  Object.fromEntries(labels.map((label, index) => [label, make(index, labels.length)]));

/** 2031…2044: a rocket, with more trail behind it every year. */
export const LAUNCHES = (labels) =>
  rungs(labels, (index) => {
    const trail = Array.from({ length: index + 1 }, (_, step) =>
      circle(50, 54 + step * 3.2, Math.max(2.5, 7 - step * 0.35)),
    );
    return [
      poly([
        [50, 6],
        [62, 30],
        [62, 46],
        [38, 46],
        [38, 30],
      ]),
      wedge([38, 38], [24, 58], 11),
      wedge([62, 38], [76, 58], 11),
      hole.circle(50, 28, 6),
      ...trail,
    ];
  });

/** $4…$17: a coin for every dollar over the last, stacked up. */
export const BILLS = (labels) =>
  rungs(labels, (index) => {
    const count = index + 1;
    // The stack is centred on the box rather than resting on the floor of it,
    // so a four-dollar bill is a coin you can see rather than a line near the
    // bottom edge. Tall stacks still fill the box.
    const bottom = Math.min(88, 57 + ((count - 1) * 5.2) / 2);
    const coins = Array.from({ length: count }, (_, step) =>
      ellipse(50, bottom - step * 5.2, 26 - (step % 2) * 3, 7),
    );
    return coins.reverse();
  });

/** 30g…225g: a purse, and a pile that grows into a hoard. */
export const REWARDS = (labels) =>
  rungs(labels, (index) => {
    const coins = [];
    let left = index + 1;
    let row = 0;
    while (left > 0) {
      const width = Math.min(left, 4);
      for (let step = 0; step < width; step++) {
        coins.push(circle(50 - (width - 1) * 9 + step * 18, 88 - row * 11, 7.5));
      }
      left -= width;
      row++;
    }
    return [
      dome(50, 22, 18, 200),
      poly([
        [32, 22],
        [68, 22],
        [62, 38],
        [38, 38],
      ]),
      ...coins,
    ];
  });

/** 10m…75m: the surface at the top, and a weight hanging further below it. */
export const DEPTHS = (labels) =>
  rungs(labels, (index, total) => {
    const reach = index / (total - 1);
    const y = 28 + reach * 52;
    // The weight grows as it sinks: on a strip of fourteen the line alone moves
    // too little from one rung to the next to tell them apart at a glance.
    const wide = 8 + reach * 7;
    const deep = 9 + reach * 8;
    return [
      rect(6, 8, 88, 8, 4),
      rect(18, 20, 64, 6, 3),
      ...stroke(
        [
          [50, 20],
          [50, y - deep / 2],
        ],
        4,
      ),
      poly([
        [50 - wide, y - deep / 2],
        [50 + wide, y - deep / 2],
        [50 + wide * 0.7, y + deep / 2],
        [50 - wide * 0.7, y + deep / 2],
      ]),
    ];
  });

/** 20cm…215cm: a plant in a pot, taller every rung. */
export const HEIGHTS = (labels) =>
  rungs(labels, (index, total) => {
    // Even the shortest is a sprout with a head on it, not a bare pot.
    const top = 64 - (index / (total - 1)) * 52;
    const leaves = [];
    for (let y = 66; y > top + 6; y -= 12) {
      leaves.push(ellipse(38, y, 13, 7, -25), ellipse(62, y - 6, 13, 7, 25));
    }
    return [
      ...stroke(
        [
          [50, 78],
          [50, top],
        ],
        6,
      ),
      dome(50, top, 8, 200),
      ...leaves,
      poly([
        [30, 78],
        [70, 78],
        [64, 92],
        [36, 92],
      ]),
      rect(26, 72, 48, 8, 3),
    ];
  });

/**
 * The interface's own shapes: the lamp on the clue button, the chart an empty
 * statistics screen starts with, and the solid triangle on every back link.
 */
export const UI = {
  back: [
    poly([
      [72, 14],
      [72, 86],
      [22, 50],
    ]),
  ],
  clue: [
    circle(50, 38, 26),
    poly([
      [38, 56],
      [62, 56],
      [60, 74],
      [40, 74],
    ]),
    rect(40, 74, 20, 8, 3),
    rect(43, 84, 14, 7, 3),
    ...around(50, 38, 4, (angle, index) => bar([14 + index * 24, 6], [18 + index * 24, 12], 5)),
  ],
  chart: [rect(12, 56, 18, 34, 3), rect(40, 38, 18, 52, 3), rect(68, 20, 18, 70, 3)],
};
