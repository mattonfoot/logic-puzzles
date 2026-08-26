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
  '.wav': 'audio/wav',
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

async function startPuzzle(page, difficulty = 'Advanced') {
  await page.getByLabel('Play').click();
  await wait(page, 500);
  // Picking a difficulty is starting the puzzle.
  await page.getByLabel(new RegExp(`^${difficulty},`)).click();
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

  // 1. The start page: the three places the app goes.
  await fresh(page, origin);
  await shot('01-start');

  // 2. Setup — the only choice the player makes about a puzzle.
  await page.getByLabel('Play').click();
  await wait(page, 500);
  await shot('02-setup');

  // 3. Settings, which outlive any one game.
  await page.getByLabel('Back').click();
  await wait(page, 400);
  await page.getByLabel('Settings').click();
  await wait(page, 500);
  await shot('03-settings');
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 4. The grid tab, which is where a game opens.
  await startPuzzle(page);
  await shot('04-board');

  // 5. The menu, behind the burger: the one board setting and the three ways
  // to leave the puzzle behind.
  await page.getByLabel('Menu').click();
  await wait(page, 500);
  await shot('05-menu');
  await page.getByLabel('Close the menu').click();
  await wait(page, 400);

  // 6. The clue list on its own tab.
  await page.getByRole('tab', { name: /^Clues/ }).click();
  await wait(page, 400);
  await shot('06-clues');

  // 7. Holding a clue lights it up — and takes the player back to the grid.
  const clue = page.locator('[role="checkbox"]').first();
  const box = await clue.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 12);
  await page.mouse.down();
  await wait(page, 900);
  await page.mouse.up();
  await wait(page, 600);
  await shot('07-clue-focus');

  // 8. A board the answer can no longer be reached from, which is what a hint
  // reports instead of helping. The script does not know the solution, so it
  // ticks squares until a hint says the board is past saving.
  await page.getByLabel('Stop lighting up this clue').click();
  await wait(page, 300);
  const cells = page.locator('[role="button"][aria-label*=" and "]');
  const rewind = page.getByLabel(/^Rewind/);
  for (let index = 0; index < 10 && (await rewind.count()) === 0; index++) {
    const label = await cells.nth(index).getAttribute('aria-label');
    if (!label.endsWith('unknown')) continue;
    await cells.nth(index).click();
    await wait(page, 80);
    await cells.nth(index).click();
    await wait(page, 120);
    await page.getByText('Hint', { exact: true }).first().click();
    await wait(page, 350);
  }
  await shot('08-stuck');
  if (await rewind.count()) {
    await rewind.click();
    await wait(page, 400);
  }

  // 9. Finished: the result fills the screen, on a tab of its own.
  await solveWithHints(page);
  await shot('09-solved');

  // 10. The finished board, one tap away from the result.
  await page.getByRole('tab', { name: 'Grid' }).click();
  await wait(page, 500);
  await shot('10-solved-grid');

  // 11. Statistics, shown with a sample history.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate((history) => {
    localStorage.clear();
    localStorage.setItem('logic-grid:history:v1', JSON.stringify(history));
  }, sampleHistory());
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 1200);
  await page.getByLabel('Statistics').click();
  await wait(page, 800);
  await shot('11-statistics', { fullPage: true });

  // 12. Home again, with a game waiting to be resumed, in night colours., with a game waiting to be resumed.
  await page.getByLabel('Back').click();
  await wait(page, 500);
  await page.getByLabel('Settings').click();
  await wait(page, 500);
  await page.getByLabel('Match the device').click();
  await wait(page, 300);
  await page.getByLabel('Night colours').click();
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 400);
  await startPuzzle(page);
  // Two hints put real ticks on the board, so the card shows some progress.
  await solveWithHints(page, 2);
  await wait(page, 1000);
  await page.getByLabel('Back to setup').click();
  await wait(page, 700);
  await shot('12-resume-night');

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
