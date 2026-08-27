/** Corner Café: what people drink, what they eat, where they sit. */
import {
  around,
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

/** A cup: a tapering body, with whatever it needs around it. */
const cup = ({ top = 30, bottom = 24, y = 34, height = 34, handle = true, saucer = true }) => [
  poly([
    [50 - top, y],
    [50 + top, y],
    [50 + bottom, y + height],
    [50 - bottom, y + height],
  ]),
  handle ? band(50 + top - 2, y + height / 2, 12, 7, -70, 70) : null,
  saucer ? rect(50 - top - 10, y + height, (top + 10) * 2, 8, 4) : null,
];

// `band` is only used through cup(), so it is imported here rather than above.
import { band } from './draw.mjs';

export const DRINKS = {
  Latte: cup({ top: 24, bottom: 18, y: 22, height: 48 }),
  Mocha: [
    ...cup({ top: 26, bottom: 22, y: 32, height: 38, saucer: false }),
    rect(20, 76, 60, 8, 4),
    ...stroke(
      [
        [36, 26],
        [44, 18],
        [52, 26],
        [60, 18],
      ],
      5,
    ),
  ],
  Chai: [
    ellipse(46, 56, 30, 22),
    band(74, 52, 12, 7, -80, 80),
    poly([
      [16, 48],
      [4, 40],
      [16, 56],
    ]),
    rect(34, 28, 24, 10, 4),
    circle(46, 26, 6),
    rect(24, 76, 44, 8, 4),
  ],
  Cortado: [...cup({ top: 18, bottom: 14, y: 40, height: 28 }), rect(30, 68, 40, 6, 3)],
  Matcha: [
    dome(50, 44, 30, 180),
    poly([
      [20, 44],
      [80, 44],
      [70, 74],
      [30, 74],
    ]),
    rect(28, 74, 44, 8, 4),
  ],
  Espresso: [...cup({ top: 14, bottom: 11, y: 46, height: 22 }), rect(26, 68, 48, 8, 4)],
  'Flat White': cup({ top: 28, bottom: 20, y: 34, height: 34 }),
  Americano: [
    poly([
      [26, 24],
      [74, 24],
      [70, 84],
      [30, 84],
    ]),
    band(76, 48, 13, 8, -80, 80),
  ],
  Cappuccino: [
    ...cup({ top: 24, bottom: 18, y: 36, height: 32 }),
    dome(50, 36, 26, 200),
    circle(38, 26, 8),
    circle(58, 24, 10),
  ],
  Macchiato: [
    ...cup({ top: 16, bottom: 13, y: 44, height: 24 }),
    circle(50, 34, 9),
    rect(28, 68, 44, 8, 4),
  ],
  'Cold Brew': [
    poly([
      [30, 26],
      [70, 26],
      [64, 88],
      [36, 88],
    ]),
    bar([58, 24], [72, 6], 7),
    hole.of(
      poly([
        [38, 40],
        [52, 36],
        [54, 50],
        [40, 54],
      ]),
    ),
  ],
  'Oat Latte': [
    ...cup({ top: 20, bottom: 15, y: 40, height: 34, handle: false, saucer: false }),
    poly([
      [14, 30],
      [30, 30],
      [30, 82],
      [14, 82],
    ]),
    poly([
      [14, 30],
      [22, 16],
      [30, 30],
    ]),
  ],
  'Mint Tea': [
    poly([
      [30, 24],
      [70, 24],
      [64, 86],
      [36, 86],
    ]),
    hole.ellipse(42, 44, 12, 7, -30),
    hole.ellipse(58, 60, 12, 7, 25),
  ],
  'Hot Choc': [
    ...cup({ top: 26, bottom: 20, y: 38, height: 36, saucer: false }),
    rect(22, 78, 56, 8, 4),
    circle(38, 32, 9),
    circle(58, 30, 9),
    circle(48, 24, 8),
  ],
};

export const PASTRIES = {
  Croissant: [band(50, 56, 30, 20, 190, 350), circle(22, 54, 11), circle(78, 54, 11)],
  Cannelé: [
    poly([
      [32, 24],
      [68, 24],
      [74, 78],
      [26, 78],
    ]),
    hole.of(
      poly([
        [38, 40],
        [62, 40],
        [62, 46],
        [38, 46],
      ]),
    ),
    hole.of(
      poly([
        [36, 58],
        [64, 58],
        [64, 64],
        [36, 64],
      ]),
    ),
  ],
  Scone: [dome(50, 54, 32, 180), rect(18, 54, 64, 20, 3), hole.of(rect(18, 60, 64, 5))],
  Éclair: [rect(12, 38, 76, 26, 13), hole.of(rect(22, 44, 56, 6, 3))],
  Brioche: [
    dome(50, 62, 32, 190),
    rect(18, 62, 64, 16, 6),
    dome(50, 34, 15, 200),
    circle(50, 34, 10),
  ],
  Tartlet: [
    poly([
      [18, 46],
      [82, 46],
      [74, 76],
      [26, 76],
    ]),
    dome(50, 46, 32, 180),
    ...[
      [36, 36],
      [50, 30],
      [64, 36],
    ].map(([x, y]) => hole.circle(x, y, 5)),
  ],
  Danish: [
    circle(50, 52, 32),
    hole.circle(50, 52, 12),
    ...around(50, 52, 6, (angle) => hole.circle(...turn([50, 52 - 22], [50, 52], angle), 5)),
  ],
  Madeleine: [
    dome(50, 70, 34, 180),
    rect(16, 70, 68, 6, 3),
    ...around(50, 70, 5, (angle, index) =>
      hole.of(bar([50, 70], turn([50, 34], [50, 70], -50 + index * 25), 3)),
    ),
  ],
  Palmier: [
    circle(34, 46, 22),
    circle(66, 46, 22),
    hole.circle(34, 46, 8),
    hole.circle(66, 46, 8),
    poly([
      [28, 60],
      [72, 60],
      [60, 82],
      [40, 82],
    ]),
  ],
  Doughnut: [
    circle(50, 50, 36),
    hole.circle(50, 50, 13),
    ...around(50, 50, 5, (angle) =>
      hole.of(bar(turn([50, 24], [50, 50], angle), turn([50, 18], [50, 50], angle), 5)),
    ),
  ],
  Muffin: [
    dome(50, 48, 34, 190),
    poly([
      [22, 48],
      [78, 48],
      [70, 84],
      [30, 84],
    ]),
    hole.of(bar([34, 60], [38, 82], 4)),
    hole.of(bar([50, 58], [50, 82], 4)),
    hole.of(bar([66, 60], [62, 82], 4)),
  ],
  Baklava: [
    poly([
      [50, 20],
      [86, 50],
      [50, 80],
      [14, 50],
    ]),
    hole.of(
      poly([
        [50, 34],
        [70, 50],
        [50, 66],
        [30, 50],
      ]),
    ),
    circle(50, 50, 7),
  ],
  Cruffin: [circle(50, 54, 30), band(50, 54, 20, 8, 0, 300), rect(20, 76, 60, 10, 4)],
  Turnover: [
    poly([
      [14, 74],
      [50, 22],
      [86, 74],
    ]),
    hole.of(bar([34, 60], [44, 46], 5)),
    hole.of(bar([50, 66], [60, 52], 5)),
  ],
};

export const SEATS = {
  Window: [
    rect(14, 16, 72, 68, 4),
    hole.of(rect(24, 26, 22, 22, 2)),
    hole.of(rect(54, 26, 22, 22, 2)),
    hole.of(rect(24, 56, 22, 20, 2)),
    hole.of(rect(54, 56, 22, 20, 2)),
  ],
  Corner: [
    poly([
      [12, 12],
      [12, 88],
      [88, 88],
      [88, 68],
      [32, 68],
      [32, 12],
    ]),
  ],
  Patio: [
    ...stroke(
      [
        [50, 88],
        [50, 40],
      ],
      6,
    ),
    poly([
      [10, 42],
      [50, 12],
      [90, 42],
    ]),
    ...around(50, 42, 3, (angle, index) => hole.of(bar([50, 26], [10 + index * 40, 42], 4))),
  ],
  Counter: [
    rect(10, 34, 80, 10, 4),
    ...stroke(
      [
        [30, 44],
        [30, 88],
      ],
      7,
    ),
    ...stroke(
      [
        [70, 44],
        [70, 88],
      ],
      7,
    ),
    rect(20, 20, 60, 8, 4),
  ],
  Loft: [
    ...stroke(
      [
        [26, 88],
        [26, 12],
      ],
      7,
    ),
    ...stroke(
      [
        [74, 88],
        [74, 12],
      ],
      7,
    ),
    ...[24, 44, 64].flatMap((y) =>
      stroke(
        [
          [26, y],
          [74, y],
        ],
        6,
      ),
    ),
  ],
  Fireside: [
    blob(
      [
        [50, 8],
        [68, 38],
        [78, 66],
        [50, 90],
        [22, 66],
        [32, 38],
      ],
      0.3,
    ),
    hole.blob(
      [
        [50, 42],
        [62, 62],
        [50, 82],
        [38, 62],
      ],
      0.3,
    ),
  ],
  Balcony: [
    rect(10, 34, 80, 8, 3),
    rect(10, 80, 80, 8, 3),
    ...[22, 38, 54, 70].flatMap((x) =>
      stroke(
        [
          [x + 4, 40],
          [x + 4, 82],
        ],
        6,
      ),
    ),
  ],
  Alcove: [
    dome(50, 50, 38, 180),
    rect(12, 50, 76, 38, 2),
    hole.of(dome(50, 54, 22, 180)),
    hole.of(rect(28, 54, 44, 34, 2)),
  ],
  'Bar Stool': [
    ellipse(50, 30, 30, 10),
    ...stroke(
      [
        [50, 34],
        [50, 74],
      ],
      8,
    ),
    poly([
      [26, 88],
      [74, 88],
      [66, 78],
      [34, 78],
    ]),
    rect(30, 54, 40, 7, 3),
  ],
  Booth: [
    rect(12, 20, 76, 34, 8),
    rect(12, 54, 76, 20, 4),
    rect(18, 74, 10, 14, 3),
    rect(72, 74, 10, 14, 3),
  ],
  Terrace: [
    ellipse(50, 40, 38, 10),
    ...stroke(
      [
        [50, 44],
        [50, 82],
      ],
      7,
    ),
    poly([
      [26, 88],
      [74, 88],
      [68, 80],
      [32, 80],
    ]),
    ellipse(28, 24, 12, 9),
    ellipse(72, 24, 12, 9),
  ],
  Garden: [
    rect(12, 44, 76, 10, 4),
    ...stroke(
      [
        [22, 54],
        [22, 84],
      ],
      7,
    ),
    ...stroke(
      [
        [78, 54],
        [78, 84],
      ],
      7,
    ),
    rect(12, 24, 76, 8, 4),
    ellipse(50, 14, 16, 10),
  ],
  Nook: [
    rect(14, 12, 72, 76, 4),
    hole.of(rect(24, 24, 52, 16, 2)),
    hole.of(rect(24, 48, 52, 16, 2)),
    hole.of(rect(24, 70, 52, 8, 2)),
  ],
  Bench: [
    rect(10, 40, 80, 12, 4),
    rect(10, 58, 80, 10, 4),
    ...stroke(
      [
        [20, 68],
        [20, 88],
      ],
      7,
    ),
    ...stroke(
      [
        [80, 68],
        [80, 88],
      ],
      7,
    ),
  ],
};

export const THEME_MARK = [
  ...cup({ top: 26, bottom: 20, y: 38, height: 34, saucer: false }),
  rect(20, 76, 60, 9, 4),
  ...stroke(
    [
      [40, 30],
      [46, 20],
      [40, 12],
    ],
    5,
  ),
  ...stroke(
    [
      [60, 30],
      [66, 20],
      [60, 12],
    ],
    5,
  ),
];
