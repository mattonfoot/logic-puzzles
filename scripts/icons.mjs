/**
 * Draws the app's icons.
 *
 *   npm run icons        # write any icon that has no file yet, then the map
 *   npm run icons -- --sheet   # …and a contact sheet to look at them on
 *
 * Every item in every theme has a silhouette of its own, as an SVG in
 * `assets/icons`. The files are the artwork: edit one in any vector editor, or
 * replace it outright, and it survives — this script never overwrites a file
 * that already exists. It only draws what is missing and then rebuilds
 * `src/ui/icons.generated.ts` from whatever the files on disk say.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { draw } from './icons/draw.mjs';
import { REGISTRY } from './icons/registry.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const ICON_DIR = join(ROOT, 'assets', 'icons');
const MAP_FILE = join(ROOT, 'src', 'ui', 'icons.generated.ts');

const SVG = (path) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">\n  <path d="${path}" />\n</svg>\n`;

async function write() {
  let drawn = 0;
  let kept = 0;
  for (const [theme, categories] of Object.entries(REGISTRY)) {
    for (const [category, items] of Object.entries(categories)) {
      for (const [id, shapes] of Object.entries(items)) {
        // The registry is keyed by the item's **id**, which is what the app
        // builds an icon's name from — see `iconName` in src/data/themes.ts. It
        // used to be keyed by the label, which worked only for as long as every
        // label happened to slug down to its own id: rename a person and the
        // next run would quietly draw them a second icon under a new name and
        // leave the old file behind as an orphan, with the app still asking for
        // the orphan.
        //
        // A theme's own mark has no item behind it, so it is simply theme.svg.
        const name = category === 'theme' ? 'theme' : `${category}-${id}`;
        const file = join(ICON_DIR, theme, `${name}.svg`);
        if (existsSync(file)) {
          kept++;
          continue;
        }
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, SVG(draw(shapes)));
        drawn++;
      }
    }
  }
  return { drawn, kept };
}

const ATTRIBUTE = /([a-zA-Z-]+)="([^"]*)"/g;

/**
 * The shapes in one file, in the order they are painted.
 *
 * Most icons are a single filled outline and read as `[{ d }]`. The rest say
 * how they are painted as well: a shape the artist set to even-odd, or one
 * drawn as a line rather than filled, which is a cap and a join as well as a
 * width. Everything here is what the file says — this reads the artwork, it
 * does not decide anything about it.
 */
function pathsIn(markup, where) {
  const shapes = [];
  for (const [, attributes] of markup.matchAll(/<path\b([^>]*)>/g)) {
    const attr = Object.fromEntries(
      [...attributes.matchAll(ATTRIBUTE)].map(([, name, value]) => [name, value]),
    );
    if (!attr.d) throw new Error(`${where} has a <path> with no outline on it`);
    const shape = { d: attr.d };
    if (attr['fill-rule'] === 'evenodd') shape.evenOdd = true;
    if (attr.stroke && attr.stroke !== 'none') {
      const width = Number(attr['stroke-width'] ?? 1);
      if (!Number.isFinite(width) || width <= 0) {
        throw new Error(`${where} is drawn as a line with no width`);
      }
      shape.stroke = width;
      if (attr['stroke-linecap']) shape.cap = attr['stroke-linecap'];
      if (attr['stroke-linejoin']) shape.join = attr['stroke-linejoin'];
    }
    shapes.push(shape);
  }
  return shapes;
}

/**
 * A drawing's shapes, in the order they are painted, with any mask linearised.
 *
 * A mask in one of these files is always the same thing: a white box that shows
 * everything, then black shapes that knock holes in it. So a masked group reads
 * as the shapes it paints followed by the shapes that cut them, and anything
 * after the group is painted on top of the result — which is the order the file
 * already has them in. Anything else in a mask stops the build rather than
 * shipping a drawing nobody checked.
 */
function shapesIn(svg, where) {
  const cuts = new Map();
  for (const [, id, body] of svg.matchAll(/<mask\b[^>]*\bid="([^"]+)"[^>]*>(.*?)<\/mask>/gs)) {
    const box = body.match(/<rect\b[^>]*fill="#?(?:fff|ffffff|white)"[^>]*>/gi) ?? [];
    if (box.length !== 1) {
      throw new Error(`${where} has a mask that is not one white box plus its cuts`);
    }
    cuts.set(
      id,
      pathsIn(body, where).map((shape) => ({ ...shape, cut: true })),
    );
  }

  const shapes = [];
  // Everything outside <defs>, in order: a masked group, or a bare path.
  const outside = svg.replace(/<defs\b.*?<\/defs>/gs, '');
  const chunks = outside.split(/(<g\b[^>]*\bmask="url\(#[^)]+\)"[^>]*>.*?<\/g>)/gs);
  for (const chunk of chunks) {
    const masked = chunk.match(/^<g\b[^>]*\bmask="url\(#([^)]+)\)"[^>]*>(.*)<\/g>$/s);
    if (masked) {
      const [, id, inner] = masked;
      if (!cuts.has(id)) throw new Error(`${where} paints through a mask it does not define`);
      shapes.push(...pathsIn(inner, where), ...cuts.get(id));
    } else {
      shapes.push(...pathsIn(chunk, where));
    }
  }
  if (shapes.length === 0) throw new Error(`${where} has no path in it`);
  if (shapes.every((shape) => shape.cut)) throw new Error(`${where} is nothing but cuts`);
  return shapes;
}

/** Reads every icon back off disk, so hand-edited files are what ships. */
async function collect() {
  const icons = {};
  const folders = existsSync(ICON_DIR) ? await readdir(ICON_DIR, { withFileTypes: true }) : [];
  for (const folder of folders.filter((entry) => entry.isDirectory())) {
    for (const file of (await readdir(join(ICON_DIR, folder.name))).sort()) {
      if (!file.endsWith('.svg')) continue;
      const where = `${folder.name}/${file}`;
      const svg = await readFile(join(ICON_DIR, folder.name, file), 'utf8');
      icons[`${folder.name}/${file.replace(/\.svg$/, '')}`] = shapesIn(svg, where);
    }
  }
  return icons;
}

/** One shape as the source line it ships as. */
function serialise(shape) {
  const fields = [`d: '${shape.d}'`];
  if (shape.cut) fields.push('cut: true');
  if (shape.evenOdd) fields.push('evenOdd: true');
  if (shape.stroke) fields.push(`stroke: ${shape.stroke}`);
  if (shape.cap) fields.push(`cap: '${shape.cap}'`);
  if (shape.join) fields.push(`join: '${shape.join}'`);
  return `{ ${fields.join(', ')} }`;
}

const HEADER = `/**
 * The icons, as path data, built from the SVG files in assets/icons.
 *
 * Generated by \`npm run icons\` — do not edit this file. Edit the SVG the path
 * came from and run it again; it reads the files rather than redrawing them.
 */

/** Every shape is drawn in a 100 × 100 box. */
export const ICON_BOX = 100;

/**
 * One shape of one icon.
 *
 * Nearly all of them are a filled outline and carry nothing but \`d\`. The rest
 * say how the artist painted them: \`evenOdd\` for a shape whose holes are told
 * apart by crossing count rather than by winding, \`stroke\` for one drawn as a
 * line of that width rather than filled, with the cap and join the line was
 * drawn with, and \`cut\` for one that takes a piece back out of what is under
 * it.
 */
export interface IconShape {
  d: string;
  /**
   * Cut out of the shapes before it rather than painted. A drawing with holes
   * in it reads as the shapes it paints, then the shapes that take pieces back
   * out of them; anything after that is painted on top of the result.
   */
  cut?: boolean;
  evenOdd?: boolean;
  stroke?: number;
  cap?: 'butt' | 'round' | 'square';
  join?: 'bevel' | 'miter' | 'round';
}

export const ICONS: Record<string, IconShape[]> = `;

async function main() {
  const { drawn, kept } = await write();
  const icons = await collect();
  const entries = Object.entries(icons)
    .map(([name, shapes]) => `  '${name}': [${shapes.map(serialise).join(', ')}],`)
    .join('\n');
  await writeFile(MAP_FILE, `${HEADER}{\n${entries}\n};\n`);

  console.log(`  ✓ ${drawn} drawn, ${kept} already had a file`);
  console.log(`  ✓ ${Object.keys(icons).length} icons in src/ui/icons.generated.ts`);

  if (process.argv.includes('--sheet')) {
    const paint = (shape) =>
      shape.stroke
        ? `<path d="${shape.d}" fill="none" stroke="currentColor" stroke-width="${shape.stroke}"` +
          ` stroke-linecap="${shape.cap ?? 'butt'}" stroke-linejoin="${shape.join ?? 'miter'}"/>`
        : `<path d="${shape.d}" fill-rule="${shape.evenOdd ? 'evenodd' : 'nonzero'}"/>`;
    /** The same runs-and-cuts the app paints, so the sheet shows what ships. */
    const draw = (name, shapes) => {
      const out = [];
      let run = [];
      let cut = [];
      let n = 0;
      const close = () => {
        if (!run.length) return;
        if (cut.length) {
          n += 1;
          out.push(
            `<mask id="${name.replace(/\W/g, '-')}-${n}">` +
              `<rect width="100" height="100" fill="#fff"/>` +
              cut.map((shape) => `<path d="${shape.d}" fill="#000"/>`).join('') +
              `</mask>`,
            `<g mask="url(#${name.replace(/\W/g, '-')}-${n})">${run.map(paint).join('')}</g>`,
          );
        } else {
          out.push(run.map(paint).join(''));
        }
        run = [];
        cut = [];
      };
      for (const shape of shapes) {
        if (shape.cut) {
          cut.push(shape);
        } else {
          if (cut.length) close();
          run.push(shape);
        }
      }
      close();
      return out.join('');
    };
    const cells = Object.entries(icons)
      .map(
        ([name, shapes]) =>
          `<figure><svg viewBox="0 0 100 100">${draw(name, shapes)}</svg><figcaption>${name}</figcaption></figure>`,
      )
      .join('\n');
    const sheet = `<!doctype html><meta charset="utf-8"><style>
      body { font: 11px/1.3 system-ui, sans-serif; background: #F6F3EC; color: #26221B; margin: 24px; }
      main { display: grid; grid-template-columns: repeat(10, 1fr); gap: 16px 8px; }
      figure { margin: 0; text-align: center; }
      svg { width: 54px; height: 54px; fill: #26221B; color: #26221B; background: #fff; border: 1px solid #E4DFD4; }
      figcaption { margin-top: 4px; color: #6B6455; word-break: break-all; }
    </style><main>${cells}</main>`;
    await writeFile(join(ROOT, 'docs', 'icons.html'), sheet);
    console.log('  ✓ contact sheet at docs/icons.html');
  }
}

await main();
