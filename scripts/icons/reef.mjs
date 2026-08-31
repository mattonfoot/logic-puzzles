/** Reef Dive: what swims past, what is worn, and where the dive happens. */
import {
  around,
  band,
  bar,
  blob,
  circle,
  dome,
  ellipse,
  hole,
  poly,
  rect,
  star,
  stroke,
  turn,
  wedge,
} from './draw.mjs';

/** A fish: a body, a tail, and whatever fins it needs. */
const fish = ({ rx = 30, ry = 16, cy = 50, tail = 22 } = {}) => [
  ellipse(46, cy, rx, ry),
  poly([
    [46 + rx - 4, cy],
    [46 + rx + tail, cy - tail * 0.8],
    [46 + rx + tail, cy + tail * 0.8],
  ]),
];

export const SPECIES = {
  octopus: [
    dome(50, 48, 26, 200),
    ...around(50, 50, 5, (angle, index) =>
      stroke(
        [
          [50, 50],
          turn([50, 84], [50, 50], -50 + index * 25),
          turn([58, 92], [50, 50], -50 + index * 25),
        ],
        7,
      ),
    ),
    hole.circle(40, 40, 5),
    hole.circle(60, 40, 5),
  ],
  manta: [
    poly([
      [50, 26],
      [92, 62],
      [64, 66],
      [50, 60],
      [36, 66],
      [8, 62],
    ]),
    ...stroke(
      [
        [50, 60],
        [50, 92],
      ],
      6,
    ),
    poly([
      [42, 26],
      [36, 14],
      [50, 20],
      [64, 14],
      [58, 26],
    ]),
  ],
  turtle: [
    ellipse(50, 52, 30, 24),
    hole.of(ellipse(50, 52, 14, 11)),
    circle(50, 20, 11),
    ellipse(22, 30, 12, 8, -35),
    ellipse(78, 30, 12, 8, 35),
    ellipse(24, 74, 11, 7, 35),
    ellipse(76, 74, 11, 7, -35),
  ],
  seahorse: [
    blob(
      [
        [52, 12],
        [70, 22],
        [58, 40],
        [62, 60],
        [46, 76],
        [40, 56],
        [42, 30],
      ],
      0.3,
    ),
    poly([
      [52, 12],
      [70, 8],
      [64, 20],
    ]),
    ...band(40, 82, 12, 8, -90, 180),
  ],
  moray: [
    ...stroke(
      [
        [8, 78],
        [30, 56],
        [22, 34],
        [46, 22],
        [76, 30],
      ],
      12,
    ),
    circle(82, 34, 14),
    poly([
      [74, 44],
      [92, 46],
      [84, 54],
    ]),
    hole.circle(84, 30, 4),
  ],
  clownfish: [
    ...fish({ rx: 26, ry: 16, tail: 18 }),
    hole.of(rect(36, 36, 7, 30, 3)),
    hole.of(rect(54, 38, 7, 26, 3)),
  ],
  barracuda: [
    ellipse(46, 50, 38, 11),
    poly([
      [80, 50],
      [96, 36],
      [96, 64],
    ]),
    poly([
      [8, 44],
      [22, 50],
      [8, 56],
    ]),
    poly([
      [30, 40],
      [46, 24],
      [50, 40],
    ]),
  ],
  stingray: [
    poly([
      [50, 24],
      [90, 58],
      [50, 70],
      [10, 58],
    ]),
    ...stroke(
      [
        [50, 66],
        [56, 94],
      ],
      5,
    ),
    star(58, 94, 4, 8, 0.3),
  ],
  lionfish: [
    ellipse(48, 54, 24, 15),
    ...around(48, 54, 9, (angle) => wedge([48, 54], turn([48, 54 - 42], [48, 54], angle), 9)),
    circle(28, 50, 8),
  ],
  grouper: [
    ...fish({ rx: 32, ry: 20, tail: 20 }),
    circle(22, 44, 5),
    poly([
      [40, 32],
      [58, 26],
      [56, 36],
    ]),
  ],
  pipefish: [
    ...stroke(
      [
        [10, 62],
        [34, 54],
        [58, 58],
        [84, 44],
      ],
      8,
    ),
    poly([
      [84, 44],
      [94, 34],
      [92, 54],
    ]),
    circle(14, 62, 7),
  ],
  'reef-shark': [
    ellipse(46, 54, 34, 16),
    poly([
      [46, 38],
      [56, 12],
      [64, 40],
    ]),
    poly([
      [76, 54],
      [96, 36],
      [92, 66],
    ]),
    poly([
      [30, 66],
      [38, 84],
      [50, 66],
    ]),
    hole.of(
      poly([
        [16, 56],
        [34, 58],
        [16, 62],
      ]),
    ),
  ],
  cuttlefish: [
    ellipse(50, 42, 24, 26),
    ...around(50, 66, 4, (angle, index) =>
      stroke(
        [
          [50, 66],
          [34 + index * 11, 92],
        ],
        6,
      ),
    ),
    hole.of(rect(34, 26, 32, 6, 3)),
    hole.of(rect(36, 40, 28, 6, 3)),
  ],
  'sea-urchin': [
    circle(50, 52, 20),
    ...around(50, 52, 12, (angle) =>
      bar(turn([50, 52 - 18], [50, 52], angle), turn([50, 52 - 40], [50, 52], angle), 5),
    ),
  ],
};

export const GEAR = {
  'red-fins': [
    poly([
      [26, 20],
      [44, 20],
      [38, 84],
      [16, 76],
    ]),
    poly([
      [56, 20],
      [74, 20],
      [84, 76],
      [62, 84],
    ]),
  ],
  'blue-mask': [
    rect(12, 32, 76, 36, 14),
    hole.of(rect(22, 40, 24, 20, 8)),
    hole.of(rect(54, 40, 24, 20, 8)),
    rect(12, 24, 76, 8, 4),
  ],
  'green-tank': [rect(30, 22, 40, 62, 14), rect(42, 10, 16, 14, 4), band(70, 40, 12, 7, -80, 80)],
  'yellow-torch': [
    rect(34, 40, 32, 46, 6),
    poly([
      [26, 14],
      [74, 14],
      [66, 40],
      [34, 40],
    ]),
    ...around(50, 8, 3, (angle, index) => bar([34 + index * 16, 10], [30 + index * 20, 2], 4)),
  ],
  'black-camera': [
    rect(10, 32, 80, 46, 8),
    circle(50, 55, 18),
    hole.circle(50, 55, 8),
    rect(30, 22, 24, 10, 3),
  ],
  'white-slate': [
    rect(18, 16, 64, 68, 6),
    hole.of(rect(28, 30, 44, 6, 3)),
    hole.of(rect(28, 46, 44, 6, 3)),
    hole.of(rect(28, 62, 26, 6, 3)),
    rect(74, 30, 14, 40, 5),
  ],
  'orange-reel': [
    circle(50, 50, 32),
    hole.circle(50, 50, 10),
    circle(50, 50, 20),
    hole.circle(50, 50, 15),
    ...stroke(
      [
        [78, 42],
        [94, 32],
      ],
      6,
    ),
  ],
  'pink-buoy': [
    circle(50, 58, 28),
    ...stroke(
      [
        [50, 30],
        [50, 8],
      ],
      6,
    ),
    poly([
      [50, 8],
      [78, 16],
      [50, 26],
    ]),
  ],
  'silver-knife': [
    poly([
      [34, 8],
      [50, 12],
      [50, 62],
      [34, 58],
    ]),
    rect(30, 62, 24, 8, 3),
    ...stroke(
      [
        [42, 70],
        [42, 92],
      ],
      10,
    ),
  ],
  'teal-compass': [
    circle(50, 50, 34),
    hole.circle(50, 50, 26),
    poly([
      [50, 26],
      [58, 50],
      [50, 74],
      [42, 50],
    ]),
    circle(50, 50, 6),
  ],
  'grey-gloves': [
    poly([
      [22, 40],
      [30, 22],
      [46, 22],
      [52, 46],
      [46, 84],
      [22, 80],
    ]),
    rect(52, 30, 10, 22, 5),
    rect(64, 34, 10, 20, 5),
    rect(76, 40, 9, 16, 4),
  ],
  'amber-lamp': [
    dome(50, 34, 22, 200),
    poly([
      [28, 34],
      [72, 34],
      [64, 76],
      [36, 76],
    ]),
    rect(30, 76, 40, 8, 3),
    ...stroke(
      [
        [50, 12],
        [50, 24],
      ],
      5,
    ),
  ],
  'coral-flag': [
    ...stroke(
      [
        [26, 92],
        [26, 10],
      ],
      7,
    ),
    poly([
      [30, 14],
      [84, 30],
      [30, 50],
    ]),
  ],
  'navy-hood': [
    dome(50, 46, 34, 210),
    poly([
      [16, 46],
      [84, 46],
      [78, 84],
      [22, 84],
    ]),
    hole.of(ellipse(50, 50, 18, 16)),
  ],
};

export const SITES = {
  'blue-hole': [
    circle(50, 52, 36),
    hole.circle(50, 52, 20),
    ...stroke(
      [
        [10, 16],
        [90, 16],
      ],
      8,
    ),
  ],
  'lace-wall': [
    rect(8, 74, 84, 14, 3),
    ...around(50, 74, 5, (angle, index) =>
      wedge([26 + index * 12, 78], [18 + index * 16, 20 + (index % 2) * 14], 14),
    ),
  ],
  shipwreck: [
    poly([
      [10, 52],
      [90, 52],
      [74, 82],
      [26, 82],
    ]),
    ...stroke(
      [
        [46, 52],
        [46, 12],
      ],
      7,
    ),
    poly([
      [50, 16],
      [82, 30],
      [50, 40],
    ]),
    rect(6, 84, 88, 6, 3),
  ],
  'kelp-maze': [
    ...[20, 40, 60, 80].flatMap((x, index) =>
      stroke(
        [
          [x, 92],
          [x + (index % 2 ? 8 : -8), 60],
          [x, 24],
        ],
        8,
      ),
    ),
    rect(6, 88, 88, 6, 3),
  ],
  'coral-arch': [band(50, 76, 36, 16, 180, 360), rect(6, 82, 88, 8, 3)],
  'night-cove': [
    circle(66, 30, 22),
    hole.circle(78, 22, 20),
    rect(6, 60, 88, 9, 4),
    rect(16, 76, 72, 9, 4),
  ],
  'tide-pools': [
    ellipse(30, 46, 20, 12),
    ellipse(66, 40, 14, 9),
    ellipse(52, 70, 24, 13),
    hole.of(ellipse(30, 46, 10, 5)),
    hole.of(ellipse(52, 70, 12, 6)),
  ],
  'anchor-bay': [
    ...stroke(
      [
        [50, 16],
        [50, 84],
      ],
      8,
    ),
    circle(50, 16, 11),
    hole.circle(50, 16, 5),
    rect(26, 30, 48, 8, 3),
    band(50, 62, 30, 9, 20, 160),
  ],
  'sea-fan-bay': [
    ...around(50, 84, 7, (angle, index) =>
      wedge([50, 88], turn([50, 20], [50, 88], -45 + index * 15), 16),
    ),
    rect(10, 84, 80, 8, 3),
  ],
  'lantern-reef': [
    dome(50, 34, 20, 200),
    poly([
      [30, 34],
      [70, 34],
      [64, 70],
      [36, 70],
    ]),
    rect(32, 70, 36, 8, 3),
    ...around(50, 52, 4, (angle, index) => circle(18 + index * 22, 86, 5)),
  ],
  'sunken-pier': [
    rect(8, 40, 84, 10, 3),
    ...[22, 42, 62, 82].flatMap((x) =>
      stroke(
        [
          [x, 50],
          [x, 90],
        ],
        7,
      ),
    ),
  ],
  'green-lagoon': [
    band(50, 40, 40, 12, 200, 340),
    rect(10, 62, 80, 9, 4),
    rect(20, 78, 60, 9, 4),
    circle(76, 26, 9),
  ],
  'cavern-ridge': [
    poly([
      [6, 88],
      [30, 30],
      [54, 88],
    ]),
    poly([
      [44, 88],
      [70, 46],
      [94, 88],
    ]),
    hole.of(dome(30, 88, 14, 180)),
    hole.of(rect(16, 88, 28, 6)),
  ],
  'turtle-point': [
    ellipse(50, 56, 34, 26),
    hole.of(ellipse(50, 56, 15, 12)),
    circle(50, 22, 10),
    rect(8, 84, 84, 8, 3),
  ],
};

export const THEME_MARK = [
  ...fish({ rx: 28, ry: 18, cy: 46, tail: 20 }),
  hole.circle(30, 40, 5),
  rect(10, 80, 80, 8, 4),
];
