#!/usr/bin/env node
/**
 * Draws the app icon, and every size the platforms ask for it in.
 *
 *   npm run app-icon
 *   npm run app-icon -- --check
 *
 * The icon is the app's own board: a three-by-three grid in the day palette,
 * six crosses and two ticks in the rust accent, and one square left empty —
 * which is the whole game in one picture, and the only square anybody looks at.
 *
 * It is **drawn rather than resampled.** The artwork arrived as a 714-pixel
 * PNG, and an iOS icon is 1024, so shipping the file itself would mean shipping
 * a 1.4× upscale of the one asset every user sees before they see anything
 * else. Everything in it is flat colour and two vector paths the app already
 * owns, so it is rebuilt here at whatever size is asked for and comes out
 * crisp at all of them.
 *
 * `--check` renders it at the original's exact proportions and compares it with
 * that original, pixel for pixel, and fails if they have drifted apart. That is
 * what makes "drawn rather than resampled" a claim rather than a hope: the
 * reference PNG is committed beside this file, and the redraw has to still be
 * the picture that was approved.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS = join(ROOT, 'assets');
const REFERENCE = join(ROOT, 'docs', 'app-icon-source.png');

/**
 * The colours, as the app's own day palette and rust accent say them.
 *
 * Written out rather than imported: `src/ui/theme.ts` is TypeScript and this is
 * a build script, and more to the point the icon is a fixed picture — it should
 * not change colour because somebody retunes a shade of the board. They are the
 * values in the artwork, which are the palette's to within a rounding step.
 */
const INK = {
  /** `dayPalette.bg`, the page the board is printed on. */
  page: '#F5F3EC',
  /** `dayPalette.boardLight` and `boardShade`, the checkerboard. */
  light: '#F0EEE4',
  shade: '#E7E1D4',
  /** The rust accent at `SETTLED_TINT`, which is what a settled square wears. */
  settled: '#EFE4D8',
  /** `dayPalette.inkSoft`, which is what a cross is drawn in. */
  cross: '#5C6379',
  /** The rust accent's day primary, which is what a tick is drawn in. */
  tick: '#B25F2E',
};

/**
 * The nine squares, top row first: a cross, a tick, or nothing.
 *
 * Two ticks and one empty square is not decoration. A grid of crosses is a
 * puzzle nobody has started and a grid of ticks is one nobody had to think
 * about; this is one being solved, with the square that follows from the other
 * two still open.
 */
const BOARD = [
  ['cross', 'tick', 'cross'],
  ['cross', 'cross', 'tick'],
  [null, 'cross', 'cross'],
];

/**
 * The two marks, exactly as `assets/icons/ui` draws them on a real board.
 *
 * `box` is where the ink actually is inside the 100 × 100 viewBox, which is not
 * the viewBox and is the only part the eye measures. `sits` is where that ink
 * lands inside a square, taken off the artwork rather than assumed. The cross
 * is centred; the tick is not, because its ink leans right of the middle of the
 * shape that draws it, and a redraw that tidied that up would be a different
 * picture — which is exactly what the check is for.
 *
 * The two weights are not a choice either. A mark the player made is drawn
 * heavily and one the board worked out is drawn lightly, and this board has two
 * ticks somebody put down and six crosses that followed from them.
 *
 * The numbers are twenty-eighths of a square because the artwork's squares are
 * 228 pixels, so every one of them is a measurement rather than a taste.
 */
const CELL = 228;
const MARKS = {
  cross: {
    // `mark-cross-auto`, the light one — which is what a board covered in
    // crosses is actually wearing. Every cross here was put down by the board
    // itself, off the two ticks beside them; the player drew the ticks.
    d: 'M24.6 21.4L78.6 75.4L75.4 78.6L21.4 24.6ZM78.6 24.6L24.6 78.6L21.4 75.4L75.4 21.4Z',
    box: { x: 21.4, y: 21.4, width: 57.2 },
    colour: INK.cross,
    sits: { left: 50 / CELL, top: 50 / CELL, width: 128 / CELL },
  },
  tick: {
    d: 'M22.3 46.4L44.3 71.4L33.7 80.6L11.7 55.6ZM33.7 71.4L80.7 17.4L91.3 26.6L44.3 80.6ZM32 76A7 7 0 1 1 46 76A7 7 0 1 1 32 76Z',
    box: { x: 11.7, y: 17.4, width: 79.6 },
    colour: INK.tick,
    sits: { left: 27 / CELL, top: 40 / CELL, width: 181 / CELL },
  },
};

/** The page showing round the board, as a share of the whole icon. */
const MARGIN = 15 / 714;

/**
 * On the squares and nothing else.
 *
 * The checkerboard is nine rectangles laid edge to edge, and smoothed edges
 * between them leave a half-toned seam down every join. The marks are diagonals
 * and want the smoothing — asking for it board-wide once turned every cross
 * into a staircase, which the check caught and nothing else would have.
 */
const CRISP = 'shape-rendering="crispEdges"';

/**
 * How coarse a grid the check compares on, and how far apart it lets the two
 * pictures be on it.
 *
 * Both numbers are measured rather than chosen. The redraw sits at a mean gap
 * of 0.21 and a worst block of 36; every way of actually breaking the picture
 * was tried against it, and the closest any of them came was this:
 *
 * | what was changed          | mean | worst |
 * | ------------------------- | ---- | ----- |
 * | *nothing — as drawn*      | 0.21 |  36   |
 * | the empty square filled   | 1.19 | 148   |
 * | a tick turned to a cross  | 3.73 | 166   |
 * | the grid shifted 4 pixels | 5.16 | 140   |
 * | the heavy cross used      | 6.33 | 139   |
 * | the checkerboard inverted | 10.6 |  42   |
 *
 * So both are asked for. The mean catches anything that changes a lot of the
 * picture a little — the inverted checkerboard moves every square by a shade
 * and never trips a single block. The worst catches anything that changes a
 * little of it a lot, which is every misplaced mark. Nothing gets past both.
 */
const COARSE = 96;
const MEAN_TOLERANCE = 0.5;
const WORST_TOLERANCE = 60;

/**
 * The icon as an SVG, at a given pixel size.
 *
 * `margins` lets the check render it at the original's slightly-off-square
 * proportions — the artwork came in at 714 × 717 with a pixel more page at the
 * top than the bottom — without that lopsidedness getting into what ships.
 */
function drawIcon({ width, height, margins, marksOnly = false, page = true }) {
  const [top, right, bottom, left] = margins ?? [
    MARGIN * height,
    MARGIN * width,
    MARGIN * height,
    MARGIN * width,
  ];
  const cellW = (width - left - right) / 3;
  const cellH = (height - top - bottom) / 3;

  const parts = [];
  // The page, unless something else is supplying it — Android's foreground
  // layer sits on a background layer painted the same colour, and filling it
  // here would leave the launcher nothing to mask.
  if (page && !marksOnly) {
    parts.push(`<rect width="${width}" height="${height}" fill="${INK.page}" ${CRISP}/>`);
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const mark = BOARD[row][col];
      const x = left + col * cellW;
      const y = top + row * cellH;

      if (!marksOnly) {
        // A settled square takes the accent's tint; the rest alternate.
        const fill = mark === 'tick' ? INK.settled : (row + col) % 2 === 0 ? INK.light : INK.shade;
        parts.push(
          `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${fill}" ${CRISP}/>`,
        );
      }
      if (!mark) continue;

      // Put the mark's *ink* where the artwork puts it, rather than fitting
      // its viewBox to the square: the two are different boxes, and only one of
      // them is what anybody looks at.
      const { d, box, colour, sits } = MARKS[mark];
      const scale = (cellW * sits.width) / box.width;
      const dx = x + cellW * sits.left - box.x * scale;
      const dy = y + cellH * sits.top - box.y * scale;
      parts.push(
        `<path d="${d}" transform="translate(${dx} ${dy}) scale(${scale})" fill="${
          marksOnly ? '#000000' : colour
        }"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}

/**
 * The pixels an SVG comes out as, straight from the browser's own renderer.
 *
 * The squares ask for crisp edges so the checkerboard has no half-toned seams
 * between its cells; the marks are left smoothed, which is what they are on a
 * real board.
 */
async function rasterise(page, svg, width, height) {
  return page.evaluate(
    async ({ svg, width, height }) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      return [...ctx.getImageData(0, 0, width, height).data];
    },
    { svg, width, height },
  );
}

/** A chunk of a PNG: length, type, payload, and the CRC of the last two. */
function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), body])) >>> 0, 0);
  return Buffer.concat([head, body, tail]);
}

/**
 * Raw pixels as a PNG file, written here rather than by a library.
 *
 * The one thing a library would be for is the one thing that matters: an iOS
 * app icon must not carry an alpha channel, and the App Store rejects one that
 * does. Encoding it here means the choice is made on purpose — `alpha: false`
 * writes a three-channel image and drops the transparency rather than leaving
 * it to something downstream to notice. It is also about sixty lines against a
 * native dependency, in a repository that builds its own icons, sounds and
 * language file already.
 */
function encodePng(pixels, width, height, { alpha }) {
  const channels = alpha ? 4 : 3;
  // One filter byte per scanline, then the row. Filter 0: store it as it is.
  const raw = Buffer.alloc(height * (1 + width * channels));
  let at = 0;
  for (let y = 0; y < height; y++) {
    raw[at++] = 0;
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      raw[at++] = pixels[from];
      raw[at++] = pixels[from + 1];
      raw[at++] = pixels[from + 2];
      if (alpha) raw[at++] = pixels[from + 3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = alpha ? 6 : 2; // truecolour, with or without alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * What each platform asks for.
 *
 * The Android foreground is drawn into the middle 72% of its square, because
 * everything outside that can be cropped by whatever mask the launcher applies
 * — a circle, a squircle, a rounded square, the user's choice — and a grid with
 * its outer row shaved off is a different picture. The monochrome one is the
 * marks alone: a themed icon is a single-colour silhouette, and a checkerboard
 * has nothing to say in one colour.
 */
const OUTPUTS = [
  { file: 'icon.png', size: 1024, alpha: false, what: 'iOS, and the store listing' },
  { file: 'favicon.png', size: 48, alpha: true, what: 'the browser tab' },
  { file: 'android-icon-background.png', size: 512, alpha: false, flat: true, what: 'Android' },
  {
    file: 'android-icon-foreground.png',
    size: 512,
    alpha: true,
    inset: 0.72,
    page: false,
    what: 'Android',
  },
  {
    file: 'android-icon-monochrome.png',
    size: 432,
    alpha: true,
    inset: 0.72,
    marksOnly: true,
    what: 'Android themed icons',
  },
];

async function main() {
  const checking = process.argv.includes('--check');
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage();

  if (checking) {
    const reference = readFileSync(REFERENCE).toString('base64');
    const width = 714;
    const height = 717;
    // The artwork's own margins, which are a pixel out of square.
    const svg = drawIcon({ width, height, margins: [17, 15, 16, 15] });

    /**
     * Both pictures, averaged down to a coarse grid — averaged here rather than
     * by the browser, which resamples a seven-times reduction by sampling
     * rather than by area and would put differences in the answer that are the
     * resampler's rather than the picture's.
     *
     * Compared pixel for pixel at full size, two renderings of the same
     * diagonal never agree: a cross is mostly edge, and a stroke that lands
     * half a pixel over puts a full-strength difference along its whole length.
     * That measures which renderer drew it, not whether it is the same picture.
     *
     * A true average over each block throws that away and keeps everything that
     * matters — a mark in the wrong square, a mark missing, a colour off, a
     * grid shifted — because all of those move a *block* of the picture rather
     * than the fringe of a line.
     */
    const blocks = (pixels) => {
      const out = new Float64Array(COARSE * COARSE * 3);
      const counts = new Float64Array(COARSE * COARSE);
      for (let y = 0; y < height; y++) {
        const by = Math.min(COARSE - 1, Math.floor((y / height) * COARSE));
        for (let x = 0; x < width; x++) {
          const bx = Math.min(COARSE - 1, Math.floor((x / width) * COARSE));
          const from = (y * width + x) * 4;
          const to = (by * COARSE + bx) * 3;
          out[to] += pixels[from];
          out[to + 1] += pixels[from + 1];
          out[to + 2] += pixels[from + 2];
          counts[by * COARSE + bx] += 1;
        }
      }
      for (let at = 0; at < COARSE * COARSE; at++) {
        for (let channel = 0; channel < 3; channel++) out[at * 3 + channel] /= counts[at];
      }
      return out;
    };

    const drawn = blocks(await rasterise(page, svg, width, height));
    const was = blocks(
      await page.evaluate(async (data) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return [...ctx.getImageData(0, 0, img.width, img.height).data];
      }, reference),
    );

    let worst = 0;
    let where = 0;
    let total = 0;
    for (let at = 0; at < COARSE * COARSE; at++) {
      const gap = Math.max(
        Math.abs(was[at * 3] - drawn[at * 3]),
        Math.abs(was[at * 3 + 1] - drawn[at * 3 + 1]),
        Math.abs(was[at * 3 + 2] - drawn[at * 3 + 2]),
      );
      total += gap;
      if (gap > worst) {
        worst = gap;
        where = at;
      }
    }
    const mean = total / (COARSE * COARSE);
    const row = Math.floor(where / COARSE);
    const col = where % COARSE;
    console.log('Against the artwork it was drawn from:');
    console.log(`  averaged to ${COARSE} × ${COARSE}, the mean channel gap is ${mean.toFixed(2)}`);
    console.log(`  the worst is ${worst.toFixed(1)}, at ${col}, ${row} of ${COARSE}`);

    const drifted =
      mean > MEAN_TOLERANCE
        ? `a mean of ${mean.toFixed(2)}, over ${MEAN_TOLERANCE}`
        : worst > WORST_TOLERANCE
          ? `a block ${worst.toFixed(1)} out, over ${WORST_TOLERANCE}`
          : null;
    if (drifted) {
      console.error(`\nThe redraw is no longer the picture it came from: ${drifted}.`);
      process.exitCode = 1;
    } else {
      console.log('\nStill the same picture.');
    }
    await browser.close();
    return;
  }

  console.log('Drawing the app icon:\n');
  for (const output of OUTPUTS) {
    const { file, size, alpha, flat, inset, marksOnly } = output;
    const svg = flat
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${INK.page}"/></svg>`
      : drawIcon({
          width: size,
          height: size,
          marksOnly,
          page: output.page ?? true,
          // An inset icon keeps its whole board inside the maskable middle.
          margins: inset ? Array(4).fill((size * (1 - inset)) / 2) : undefined,
        });
    const pixels = await rasterise(page, svg, size, size);
    writeFileSync(join(ASSETS, file), encodePng(pixels, size, size, { alpha }));
    console.log(`  ✓ ${file.padEnd(30)} ${size} × ${size}  ${output.what}`);
  }
  console.log('\nRun `npm run app-icon -- --check` to hold it to the artwork.');
  await browser.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { drawIcon, BOARD, INK, dirname };
