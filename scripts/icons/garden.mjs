/** Blue Ribbon Garden: what is grown, what it grows in, and what it is grown with. */
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

/** A bloom on a stem: petals of a shape, a middle, and a leaf. */
const bloom = ({ petals, petal, centre = 8, leaf = true, cy = 38, stem = 88 }) => [
  ...around(50, cy, petals, (angle) => petal(angle, cy)),
  circle(50, cy, centre),
  ...stroke(
    [
      [50, cy],
      [50, stem],
    ],
    6,
  ),
  leaf ? ellipse(34, stem - 20, 14, 8, -25) : null,
];

const roundPetal = (r, spread) => (angle, cy) =>
  ellipse(...turn([50, cy - r], [50, cy], angle), spread, spread * 1.4, angle);

export const FLOWERS = {
  Dahlia: bloom({ petals: 12, petal: roundPetal(20, 6), centre: 9 }),
  Peony: bloom({ petals: 7, petal: roundPetal(18, 11), centre: 10 }),
  Iris: [
    ...around(50, 40, 3, (angle) => wedge([50, 40], turn([50, 4], [50, 40], angle + 60), 20)),
    ...around(50, 40, 3, (angle) => ellipse(...turn([50, 62], [50, 40], angle), 10, 16, angle)),
    ...stroke(
      [
        [50, 40],
        [50, 90],
      ],
      6,
    ),
  ],
  Tulip: [
    poly([
      [30, 34],
      [70, 34],
      [62, 66],
      [38, 66],
    ]),
    dome(38, 34, 10, 200),
    dome(50, 30, 12, 200),
    dome(62, 34, 10, 200),
    ...stroke(
      [
        [50, 62],
        [50, 92],
      ],
      6,
    ),
    ellipse(32, 74, 14, 7, -20),
  ],
  Aster: [
    ...around(50, 40, 10, (angle) => wedge([50, 40], turn([50, 8], [50, 40], angle), 9)),
    circle(50, 40, 8),
    ...stroke(
      [
        [50, 40],
        [50, 92],
      ],
      6,
    ),
  ],
  Zinnia: [
    ...around(50, 40, 8, (angle) => roundPetal(22, 8)(angle, 40)),
    ...around(50, 40, 8, (angle) => roundPetal(12, 6)(angle + 22, 40)),
    circle(50, 40, 6),
    ...stroke(
      [
        [50, 40],
        [50, 92],
      ],
      6,
    ),
  ],
  Lupin: [
    ...stroke(
      [
        [50, 92],
        [50, 20],
      ],
      7,
    ),
    ...[26, 38, 50, 62, 74].flatMap((y, index) => [
      ellipse(50 - 12 + (index % 2) * 2, y, 12, 7, -20),
      ellipse(50 + 12 - (index % 2) * 2, y, 12, 7, 20),
    ]),
    dome(50, 22, 9, 200),
  ],
  Freesia: [
    ...stroke(
      [
        [16, 86],
        [76, 26],
      ],
      6,
    ),
    ...[
      [40, 62],
      [56, 48],
      [72, 34],
    ].map(([x, y]) =>
      poly([
        [x, y],
        [x + 20, y - 8],
        [x + 16, y + 8],
      ]),
    ),
  ],
  Marigold: [
    ...around(50, 40, 14, (angle) => ellipse(...turn([50, 18], [50, 40], angle), 7, 9, angle)),
    circle(50, 40, 14),
    ...stroke(
      [
        [50, 40],
        [50, 92],
      ],
      6,
    ),
  ],
  Foxglove: [
    ...stroke(
      [
        [42, 92],
        [50, 18],
      ],
      7,
    ),
    ...[30, 44, 58, 72].flatMap((y, index) => [
      ellipse(34 + index, y, 12, 9, -20),
      ellipse(64 - index, y + 6, 12, 9, 20),
    ]),
  ],
  Camellia: [
    ...around(50, 42, 6, (angle) => roundPetal(19, 12)(angle, 42)),
    circle(50, 42, 9),
    ellipse(26, 74, 16, 9, -30),
    ellipse(74, 76, 16, 9, 30),
    ...stroke(
      [
        [50, 42],
        [50, 92],
      ],
      6,
    ),
  ],
  'Sweet Pea': [
    ellipse(34, 40, 20, 16, -25),
    ellipse(66, 40, 20, 16, 25),
    ellipse(50, 62, 14, 12),
    ...stroke(
      [
        [50, 62],
        [50, 92],
      ],
      5,
    ),
    ...band(64, 82, 12, 5, 90, 300),
  ],
  Snapdragon: [
    ...stroke(
      [
        [46, 92],
        [52, 20],
      ],
      7,
    ),
    ...[28, 42, 56, 70].map((y, index) =>
      poly([
        [52, y],
        [78 - index * 2, y - 10],
        [76, y + 10],
      ]),
    ),
    dome(50, 20, 8, 200),
  ],
  Cosmos: [
    ...around(50, 40, 8, (angle) => ellipse(...turn([50, 18], [50, 40], angle), 10, 13, angle)),
    circle(50, 40, 8),
    ...stroke(
      [
        [50, 40],
        [50, 92],
      ],
      5,
    ),
    ellipse(66, 70, 14, 5, 20),
  ],
};

/** A pot: a rim, a body that tapers, and sometimes a saucer under it. */
const pot = ({
  rim = 34,
  top = 30,
  bottom = 20,
  y = 30,
  height = 50,
  saucer = false,
  feet = false,
}) => [
  rect(50 - rim, y, rim * 2, 10, 3),
  poly([
    [50 - top, y + 10],
    [50 + top, y + 10],
    [50 + bottom, y + height],
    [50 - bottom, y + height],
  ]),
  saucer ? rect(50 - bottom - 10, y + height, (bottom + 10) * 2, 8, 4) : null,
  feet ? rect(50 - bottom, y + height, 10, 8, 2) : null,
  feet ? rect(50 + bottom - 10, y + height, 10, 8, 2) : null,
];

export const POTS = {
  Terracotta: pot({ rim: 34, top: 30, bottom: 20, height: 50, saucer: true }),
  Cobalt: pot({ rim: 30, top: 28, bottom: 24, y: 24, height: 58 }),
  Ivory: pot({ rim: 22, top: 20, bottom: 14, y: 40, height: 36, saucer: true }),
  Copper: [
    ellipse(50, 46, 26, 24),
    rect(24, 30, 52, 10, 3),
    band(76, 46, 12, 7, -80, 80),
    rect(38, 70, 24, 10, 3),
  ],
  Slate: [rect(18, 34, 64, 52, 2), rect(12, 26, 76, 10, 2)],
  Mint: pot({ rim: 24, top: 22, bottom: 18, y: 38, height: 40 }),
  Rust: [pot({ rim: 32, top: 28, bottom: 22, y: 26, height: 52 }), hole.circle(50, 74, 7)].flat(),
  Cream: pot({ rim: 24, top: 22, bottom: 16, y: 36, height: 42, feet: true }),
  Indigo: [
    dome(50, 52, 30, 200),
    poly([
      [20, 52],
      [80, 52],
      [72, 84],
      [28, 84],
    ]),
    rect(26, 26, 48, 10, 3),
    ...stroke(
      [
        [36, 36],
        [36, 52],
      ],
      5,
    ),
    ...stroke(
      [
        [64, 36],
        [64, 52],
      ],
      5,
    ),
  ],
  Charcoal: [rect(24, 36, 52, 48, 3), rect(18, 28, 64, 10, 3), hole.of(rect(34, 48, 32, 8, 2))],
  Blush: [
    ellipse(50, 58, 30, 26),
    rect(28, 34, 44, 10, 4),
    poly([
      [34, 44],
      [66, 44],
      [62, 58],
      [38, 58],
    ]),
  ],
  Amber: pot({ rim: 36, top: 32, bottom: 26, y: 28, height: 54, saucer: true }),
  Olive: [
    rect(26, 40, 48, 44, 4),
    rect(20, 32, 60, 10, 3),
    band(50, 32, 20, 6, 190, 350),
    hole.of(rect(36, 56, 28, 6, 2)),
  ],
  Plum: [
    ellipse(50, 62, 32, 24),
    poly([
      [26, 40],
      [74, 40],
      [78, 66],
      [22, 66],
    ]),
    rect(30, 30, 40, 10, 4),
  ],
};

/** A tool: a handle with a head on the end of it. */
const tool = (head, { from = [34, 90], to = [56, 40], width = 8 } = {}) => [
  ...stroke([from, to], width),
  ...head,
];

export const TOOLS = {
  Trowel: tool(
    [
      poly([
        [38, 44],
        [74, 30],
        [66, 8],
        [44, 12],
      ]),
    ],
    { from: [30, 88], to: [50, 46] },
  ),
  Shears: [
    ...stroke(
      [
        [20, 86],
        [56, 34],
      ],
      7,
    ),
    ...stroke(
      [
        [80, 86],
        [44, 34],
      ],
      7,
    ),
    poly([
      [52, 38],
      [64, 6],
      [72, 14],
    ]),
    poly([
      [48, 38],
      [36, 6],
      [28, 14],
    ]),
    circle(24, 84, 9),
    circle(76, 84, 9),
  ],
  Dibber: [
    ...stroke(
      [
        [50, 20],
        [50, 74],
      ],
      12,
    ),
    poly([
      [42, 74],
      [58, 74],
      [50, 92],
    ]),
    ellipse(50, 18, 18, 9),
  ],
  Rake: [
    ...stroke(
      [
        [26, 90],
        [64, 34],
      ],
      8,
    ),
    rect(46, 22, 46, 9, 3, -20),
    ...around(50, 50, 5, (angle, index) =>
      bar([50 + index * 11, 30 - index * 4], [46 + index * 11, 48 - index * 4], 5),
    ),
  ],
  Sprayer: [
    rect(30, 34, 34, 52, 6),
    rect(38, 22, 18, 12, 3),
    poly([
      [64, 26],
      [86, 20],
      [86, 30],
      [64, 34],
    ]),
    ...around(86, 25, 3, (angle, index) => circle(92, 16 + index * 9, 3)),
  ],
  Gloves: [
    poly([
      [24, 42],
      [32, 22],
      [48, 22],
      [54, 48],
      [48, 86],
      [24, 82],
    ]),
    rect(54, 30, 10, 22, 5),
    rect(66, 34, 10, 20, 5),
    rect(78, 42, 9, 16, 4),
  ],
  Hoe: [
    ...stroke(
      [
        [24, 90],
        [66, 30],
      ],
      8,
    ),
    poly([
      [52, 30],
      [88, 22],
      [92, 40],
      [58, 44],
    ]),
  ],
  Twine: [
    ellipse(50, 56, 30, 26),
    hole.of(ellipse(50, 56, 8, 22, 20)),
    hole.of(ellipse(50, 56, 8, 22, -20)),
    ...stroke(
      [
        [74, 40],
        [92, 22],
      ],
      5,
    ),
  ],
  Secateurs: [
    ...stroke(
      [
        [26, 88],
        [52, 44],
      ],
      8,
    ),
    ...stroke(
      [
        [70, 88],
        [50, 50],
      ],
      8,
    ),
    band(50, 34, 20, 12, 180, 340),
    circle(50, 46, 6),
  ],
  Kneeler: [
    rect(12, 44, 76, 22, 6),
    rect(20, 66, 12, 22, 3),
    rect(68, 66, 12, 22, 3),
    rect(24, 34, 52, 10, 4),
  ],
  Sieve: [
    band(50, 46, 34, 10, 180, 360),
    rect(16, 46, 68, 8, 2),
    ...[26, 40, 54, 68].map((x) => bar([x, 54], [x, 74], 5)),
    ...[30, 44, 58].map((y) => bar([20, y + 34], [80, y + 34], 4)),
  ],
  'Hand Fork': [
    ...stroke(
      [
        [34, 90],
        [52, 46],
      ],
      9,
    ),
    ...[
      [40, 46],
      [52, 42],
      [64, 44],
    ].map(([x, y]) => wedge([x, y], [x + (x - 52) / 2, 12], 9)),
  ],
  'Watering Can': [
    rect(24, 40, 44, 46, 6),
    poly([
      [64, 44],
      [92, 30],
      [96, 40],
      [68, 58],
    ]),
    band(46, 36, 20, 7, 190, 350),
    rect(30, 30, 20, 10, 3),
    ...around(94, 34, 3, (angle, index) => circle(96, 24 + index * 8, 3)),
  ],
  'Plant Labels': [
    poly([
      [20, 20],
      [50, 20],
      [50, 62],
      [35, 76],
      [20, 62],
    ]),
    poly([
      [54, 34],
      [84, 34],
      [84, 72],
      [69, 86],
      [54, 72],
    ]),
    hole.of(rect(26, 32, 18, 6, 2)),
    hole.of(rect(60, 46, 18, 6, 2)),
  ],
};

export const THEME_MARK = [
  ...around(50, 34, 10, (angle) => ellipse(...turn([50, 12], [50, 34], angle), 8, 11, angle)),
  circle(50, 34, 12),
  ...stroke(
    [
      [50, 34],
      [50, 92],
    ],
    6,
  ),
  ellipse(30, 68, 16, 8, -25),
  ellipse(70, 76, 16, 8, 25),
];
