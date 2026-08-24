/**
 * Regenerates the screenshots the README links to.
 *
 *   npm run screenshots
 *
 * It exports the app for web, serves that build, drives it in Chromium at
 * iPhone proportions and writes PNGs to docs/screenshots. Run it whenever the
 * UI changes so the reference in the README matches the build.
 *
 * The browser comes from Playwright's own download (installed with the dev
 * dependencies). Set PLAYWRIGHT_CHROMIUM_PATH to point at another binary.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BUILD_DIR = join(ROOT, '.screenshot-build');
const OUT_DIR = join(ROOT, 'docs', 'screenshots');
const VIEWPORT = { width: 393, height: 852 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};

const wait = (page, ms) => page.waitForTimeout(ms);

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function serve(directory) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let path = join(directory, decodeURIComponent(url.pathname));
    try {
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    } catch {
      path = join(directory, 'index.html');
    }
    response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(response);
  });
  await new Promise((ready) => server.listen(0, ready));
  return { server, origin: `http://localhost:${server.address().port}` };
}

/** A handful of finished games, so the statistics screen has something to show. */
function sampleHistory() {
  const day = 86_400_000;
  const now = Date.now();
  // Newest first, getting quicker over time so the trend has something to say.
  const games = [
    ['cosmic', 'Cosmic Voyage', '🚀', '#4C6FFF', 'sm', '4 × 4', 214, 0, 0],
    ['reef', 'Reef Dive', '🐠', '#0EA5A4', 'sm', '4 × 4', 236, 1, 0],
    ['cafe', 'Corner Café', '☕️', '#C2703D', 'sm', '4 × 4', 259, 0, 1],
    ['quest', 'Mythic Quest', '🗡️', '#7A5AF8', 'sm', '4 × 4', 288, 0, 1],
    ['garden', 'Blue Ribbon Garden', '🌻', '#2F8F4E', 'sm', '4 × 4', 300, 0, 2],
    ['cosmic', 'Cosmic Voyage', '🚀', '#4C6FFF', 'sm', '4 × 4', 310, 1, 2],
    ['reef', 'Reef Dive', '🐠', '#0EA5A4', 'sm', '4 × 4', 325, 0, 3],
    ['quest', 'Mythic Quest', '🗡️', '#7A5AF8', 'sm', '4 × 4', 340, 2, 3],
    ['cafe', 'Corner Café', '☕️', '#C2703D', 'md', '5 × 4', 412, 1, 4],
    ['garden', 'Blue Ribbon Garden', '🌻', '#2F8F4E', 'md', '5 × 4', 468, 0, 5],
    ['cosmic', 'Cosmic Voyage', '🚀', '#4C6FFF', 'xs', '3 × 3', 96, 0, 5],
  ];
  return {
    version: 1,
    games: games.map(
      (
        [themeId, themeName, themeEmoji, accent, sizeId, sizeLabel, seconds, hintsUsed, daysAgo],
        index,
      ) => ({
        seed: 1000 + index,
        themeId,
        themeName,
        themeEmoji,
        accent,
        sizeId,
        sizeLabel,
        seconds,
        hintsUsed,
        clueCount: 12,
        revealed: false,
        finishedAt: now - daysAgo * day - index * 3_600_000,
      }),
    ),
  };
}

async function fresh(page, origin) {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 900);
}

async function startPuzzle(page, size = '4 × 4') {
  await page.getByText(size, { exact: true }).click();
  await page.getByText('Start puzzle').click();
  await wait(page, 1600);
}

async function solveWithHints(page, taps = 30) {
  for (let index = 0; index < taps; index++) {
    await page
      .getByText('Hint', { exact: true })
      .first()
      .click({ timeout: 4000 })
      .catch(() => {});
    await wait(page, 25);
  }
  await wait(page, 900);
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build');
  if (!skipBuild) {
    await rm(BUILD_DIR, { recursive: true, force: true });
    await run('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', BUILD_DIR]);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const { server, origin } = await serve(BUILD_DIR);

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));

  const shot = async (name, options = {}) => {
    await page.screenshot({ path: join(OUT_DIR, `${name}.png`), ...options });
    console.log(`  ✓ ${name}.png`);
  };

  console.log('Capturing screens:');

  // 1. Setup — the only choice the player makes.
  await fresh(page, origin);
  await shot('01-setup');

  // 2. The grid tab, which is where a game opens.
  await startPuzzle(page);
  await shot('02-board');

  // 3. The clue list on its own tab.
  await page.getByRole('tab', { name: /^Clues/ }).click();
  await wait(page, 400);
  await shot('03-clues');

  // 4. Holding a clue lights it up — and takes the player back to the grid.
  const clue = page.locator('[role="checkbox"]').first();
  const box = await clue.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 12);
  await page.mouse.down();
  await wait(page, 900);
  await page.mouse.up();
  await wait(page, 600);
  await shot('04-clue-focus');

  // 5. Finished, with the answer table.
  await solveWithHints(page);
  await shot('05-solved');

  // 6. Statistics, shown with a sample history.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate((history) => {
    localStorage.clear();
    localStorage.setItem('logic-grid:history:v1', JSON.stringify(history));
  }, sampleHistory());
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 1000);
  await page.getByText('Statistics').first().click();
  await wait(page, 800);
  await shot('06-statistics', { fullPage: true });

  // 7. Home again, with a game waiting to be resumed.
  await page.getByLabel('Back').click();
  await wait(page, 500);
  await startPuzzle(page);
  // Two hints put real ticks on the board, so the card shows some progress.
  await solveWithHints(page, 2);
  await wait(page, 1000);
  await page.getByLabel('Back to setup').click();
  await wait(page, 700);
  await shot('07-resume');

  await browser.close();
  server.close();

  if (problems.length > 0) {
    console.error('\nThe app logged errors while being captured:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }

  const written = (await readdir(OUT_DIR)).filter((file) => file.endsWith('.png'));
  console.log(`\n${written.length} screenshots in docs/screenshots.`);
  if (!skipBuild) await rm(BUILD_DIR, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
