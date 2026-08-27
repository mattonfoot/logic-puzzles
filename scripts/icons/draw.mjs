/**
 * The drawing kit the icons are made with.
 *
 * Everything is a filled shape in a 100 × 100 box, y downwards, and every shape
 * is wound clockwise so that laying one over another unions them rather than
 * punching a hole. `hole()` is the exception, and the only way to make one.
 *
 * The output of a recipe is a list of path strings; the icon is all of them in
 * one `<path>`, which keeps the file small and the colour a single attribute.
 */

const round = (value) => Math.round(value * 10) / 10;
const point = ([x, y]) => `${round(x)} ${round(y)}`;

/** Turns a point about another. */
export function turn([x, y], [cx, cy], degrees) {
  const angle = (degrees * Math.PI) / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
}

/**
 * Twice the signed area. Negative means the points run clockwise on screen,
 * which is the way a full-circle `A` pair with the sweep flag set goes — every
 * shape here has to agree with that, or two of them overlapping cancel out
 * instead of joining up.
 */
function winding(points) {
  return points.reduce((sum, [x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length];
    return sum + (nx - x) * (ny + y);
  }, 0);
}

/** A closed shape through the points, wound clockwise whichever way it is given. */
export function poly(points, { reverse = false } = {}) {
  const ordered = winding(points) <= 0 === !reverse ? points : [...points].reverse();
  return `M${point(ordered[0])}${ordered
    .slice(1)
    .map((p) => `L${point(p)}`)
    .join('')}Z`;
}

export function ellipse(cx, cy, rx, ry = rx, rotation = 0, { reverse = false } = {}) {
  const sweep = reverse ? 0 : 1;
  const left = turn([cx - rx, cy], [cx, cy], rotation);
  const right = turn([cx + rx, cy], [cx, cy], rotation);
  const arc = `A${round(rx)} ${round(ry)} ${round(rotation)} 1 ${sweep} `;
  return `M${point(left)}${arc}${point(right)}${arc}${point(left)}Z`;
}

export const circle = (cx, cy, r, options) => ellipse(cx, cy, r, r, 0, options);

/** A rectangle, optionally with rounded corners, optionally turned. */
export function rect(x, y, w, h, r = 0, rotation = 0) {
  const corners = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  const centre = [x + w / 2, y + h / 2];
  if (r <= 0) return poly(corners.map((p) => turn(p, centre, rotation)));

  const radius = Math.min(r, w / 2, h / 2);
  const points = [];
  const steps = 4;
  const arcs = [
    [x + radius, y + radius, 180, 270],
    [x + w - radius, y + radius, 270, 360],
    [x + w - radius, y + h - radius, 0, 90],
    [x + radius, y + h - radius, 90, 180],
  ];
  for (const [ax, ay, from, to] of arcs) {
    for (let step = 0; step <= steps; step++) {
      const angle = ((from + ((to - from) * step) / steps) * Math.PI) / 180;
      points.push([ax + radius * Math.cos(angle), ay + radius * Math.sin(angle)]);
    }
  }
  return poly(points.map((p) => turn(p, centre, rotation)));
}

/** A thick line from a to b, with square ends. */
export function bar(a, b, width) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / length) * (width / 2);
  const ny = ((bx - ax) / length) * (width / 2);
  return poly([
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ]);
}

/** A run of thick lines with rounded joints — stems, handles, limbs, cables. */
export function stroke(points, width) {
  const parts = [];
  for (let index = 0; index < points.length - 1; index++) {
    parts.push(bar(points[index], points[index + 1], width));
  }
  for (const joint of points.slice(1, -1)) parts.push(circle(joint[0], joint[1], width / 2));
  return parts;
}

/** A wedge: wide at the base, narrow at the tip. */
export function wedge(base, tip, width) {
  const [ax, ay] = base;
  const [bx, by] = tip;
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / length) * (width / 2);
  const ny = ((bx - ax) / length) * (width / 2);
  return poly([
    [ax + nx, ay + ny],
    [bx, by],
    [ax - nx, ay - ny],
  ]);
}

/** A star or a burst; `inner` is the waist as a fraction of `outer`. */
export function star(cx, cy, spikes, outer, inner = 0.45, offset = -90) {
  const points = [];
  for (let index = 0; index < spikes * 2; index++) {
    const radius = index % 2 === 0 ? outer : outer * inner;
    const angle = ((offset + (index * 180) / spikes) * Math.PI) / 180;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return poly(points);
}

/** Petals, legs, spikes: `count` copies of a shape turned about a centre. */
export function around(cx, cy, count, make, offset = 0) {
  return Array.from({ length: count }, (_, index) => make((index * 360) / count + offset, index));
}

/** The same shape, wound the other way, so it cuts a hole in what is under it. */
export const hole = {
  circle: (cx, cy, r) => circle(cx, cy, r, { reverse: true }),
  ellipse: (cx, cy, rx, ry, rotation) => ellipse(cx, cy, rx, ry, rotation, { reverse: true }),
  poly: (points) => poly(points, { reverse: true }),
  blob: (points, smoothing) => blob(points, smoothing, { reverse: true }),
  /** Any straight-edged or circular shape, cut out. */
  of: (path) => reverse(path),
};

/**
 * The same outline, wound the other way.
 *
 * Only the shapes this kit draws need reversing, and they are all made of
 * `L` steps and full-circle `A` pairs, so flipping the sweep flags and reading
 * the points backwards is enough.
 */
export function reverse(path) {
  if (path.includes('C')) {
    throw new Error('hole.of cannot turn a curve inside out — use hole.blob for those');
  }
  return path
    .split('Z')
    .filter((part) => part.trim())
    .map((part) => {
      if (part.includes('A')) {
        return part.replace(
          /A(\S+) (\S+) (\S+) 1 ([01])/g,
          (all, rx, ry, rot, sweep) => `A${rx} ${ry} ${rot} 1 ${sweep === '1' ? '0' : '1'}`,
        );
      }
      const points = part.replace(/^M/, '').split(/[ML]/).filter(Boolean);
      const ordered = [points[0], ...points.slice(1).reverse()];
      return `M${ordered[0]}${ordered
        .slice(1)
        .map((p) => `L${p}`)
        .join('')}`;
    })
    .map((part) => `${part}Z`)
    .join('');
}

/** A blob drawn through points with smooth corners — clouds, leaves, pastries. */
export function blob(points, smoothing = 0.35, { reverse = false } = {}) {
  const ring = winding(points) <= 0 === !reverse ? points : [...points].reverse();
  const parts = ring.map((p, index) => {
    const previous = ring[(index - 1 + ring.length) % ring.length];
    const next = ring[(index + 1) % ring.length];
    const control = [
      p[0] + (p[0] - previous[0]) * smoothing,
      p[1] + (p[1] - previous[1]) * smoothing,
    ];
    const target = [next[0] - (next[0] - p[0]) * smoothing, next[1] - (next[1] - p[1]) * smoothing];
    return { p, control, target, next };
  });
  let d = `M${point(parts[0].p)}`;
  for (const part of parts) {
    d += `C${point(part.control)} ${point(part.target)} ${point(part.next)}`;
  }
  return `${d}Z`;
}

/** Flattens a recipe's nested lists into one path. */
export const draw = (...parts) => parts.flat(4).filter(Boolean).join('');

/** The top half of a disc — hats, domes, hills, shells. */
export function dome(cx, cy, r, sweepDegrees = 180) {
  const steps = 12;
  const points = [];
  const start = 180 - (sweepDegrees - 180) / 2;
  for (let step = 0; step <= steps; step++) {
    const angle = ((start + (sweepDegrees * step) / steps) * Math.PI) / 180;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return poly(points);
}

/** A band of a ring, from one angle to another — crescents, arcs, handles. */
export function band(cx, cy, radius, thickness, fromDegrees, toDegrees) {
  const steps = 16;
  const outer = [];
  const inner = [];
  for (let step = 0; step <= steps; step++) {
    const angle = ((fromDegrees + ((toDegrees - fromDegrees) * step) / steps) * Math.PI) / 180;
    outer.push([
      cx + (radius + thickness / 2) * Math.cos(angle),
      cy + (radius + thickness / 2) * Math.sin(angle),
    ]);
    inner.push([
      cx + (radius - thickness / 2) * Math.cos(angle),
      cy + (radius - thickness / 2) * Math.sin(angle),
    ]);
  }
  return poly([...outer, ...inner.reverse()]);
}
