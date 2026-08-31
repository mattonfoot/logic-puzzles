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
    ['cosmic', 'Cosmic Voyage', 'sm', '4 × 4', 214, 7, 0],
    ['reef', 'Reef Dive', 'sm', '4 × 4', 236, 9, 0],
    ['cafe', 'Corner Café', 'sm', '4 × 4', 259, 8, 1],
    ['quest', 'Mythic Quest', 'sm', '4 × 4', 288, 10, 1],
    ['garden', 'Blue Ribbon Garden', 'sm', '4 × 4', 300, 9, 2],
    ['cosmic', 'Cosmic Voyage', 'sm', '4 × 4', 310, 12, 2],
    ['reef', 'Reef Dive', 'sm', '4 × 4', 325, 11, 3],
    ['quest', 'Mythic Quest', 'sm', '4 × 4', 340, 12, 3],
    ['cafe', 'Corner Café', 'md', '5 × 4', 412, 10, 4],
    ['garden', 'Blue Ribbon Garden', 'md', '5 × 4', 468, 12, 5],
    ['cosmic', 'Cosmic Voyage', 'xs', '3 × 3', 96, 4, 5],
  ];
  return {
    version: 1,
    games: games.map(
      ([themeId, themeName, sizeId, sizeLabel, seconds, cluesUsed, daysAgo], index) => ({
        seed: 1000 + index,
        themeId,
        themeName,
        themeIcon: `${themeId}/theme`,
        sizeId,
        sizeLabel,
        difficulty: { xs: 'Beginner', sm: 'Advanced', md: 'Expert', lg: 'Pro' }[sizeId],
        seconds,
        cluesUsed,
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

/**
 * Opens a numbered puzzle. A game introduces itself with its briefing, which
 * covers the board, so that window is shut on the way in unless the caller
 * wants to photograph it.
 */
async function startPuzzle(page, difficulty = 'Advanced', number = 1, keepBriefing = false) {
  await page.getByLabel('Play', { exact: true }).click();
  await wait(page, 500);
  // A difficulty opens its numbered list; the number is the puzzle's seed.
  await page.getByLabel(difficulty, { exact: true }).click();
  await wait(page, 500);
  await page.getByLabel(`Puzzle ${number}`, { exact: true }).click();
  await wait(page, 1600);
  if (!keepBriefing) {
    await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
    await wait(page, 400);
  }
}

/**
 * The puzzle in play, read out of the game the app saves as it goes. The board
 * is the only place the answer lives, and the script needs it to tick squares
 * on purpose rather than at random.
 */
async function puzzleInPlay(page) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const saved = await page.evaluate(() => localStorage.getItem('logic-grid:saved-game:v1'));
    if (saved) return JSON.parse(saved).puzzle;
    await wait(page, 300);
  }
  throw new Error('no saved game to read the puzzle from');
}

const labelOf = (puzzle, category, item) => puzzle.categories[category].items[item].label;

/**
 * Cycles one square round to the mark asked for: 'matched' for a tick, 'ruled
 * out' for a cross. The squares say which they are showing, so this works
 * wherever the square sits in the staircase and whatever is already on it.
 */
async function mark(page, puzzle, c1, i1, c2, i2, want = 'matched') {
  // The staircase draws each pair of sets once, and which of the two is the row
  // depends on where the pair lands in it — so look for the square either way
  // round rather than assuming.
  const a = labelOf(puzzle, c1, i1);
  const b = labelOf(puzzle, c2, i2);
  const forward = page.locator(`[aria-label^="${a} and ${b}: "]`);
  const backward = page.locator(`[aria-label^="${b} and ${a}: "]`);
  const square = (await forward.count())
    ? forward.first()
    : (await backward.count())
      ? backward.first()
      : null;
  if (!square) return;
  for (let step = 0; step < 3; step++) {
    // The board goes away the moment the puzzle is finished, so a square that
    // stops answering is the run being over rather than a fault.
    const label = await square.getAttribute('aria-label', { timeout: 2000 }).catch(() => null);
    if (label === null || label.endsWith(want)) return;
    await square.click();
    await wait(page, 60);
  }
}

const tick = (page, puzzle, c1, i1, c2, i2) => mark(page, puzzle, c1, i1, c2, i2, 'matched');

/** Ticks the true pairings until the puzzle is finished, or `pairs` of them. */
async function solve(page, puzzle, pairs = Infinity) {
  const finished = page.getByText('Solved!', { exact: true });
  let done = 0;
  for (let c1 = 0; c1 < puzzle.categories.length; c1++) {
    for (let c2 = c1 + 1; c2 < puzzle.categories.length; c2++) {
      for (let entity = 0; entity < puzzle.size.items; entity++) {
        // The rest of the board can follow from what is already ticked.
        if (done >= pairs || (await finished.count())) return;
        await tick(page, puzzle, c1, puzzle.solution[c1][entity], c2, puzzle.solution[c2][entity]);
        done++;
      }
    }
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

  // 2. The difficulties, the first of the two things a player chooses.
  await page.getByLabel('Play', { exact: true }).click();
  await wait(page, 500);
  await shot('02-setup');

  // 3. The numbered games at that difficulty, which is the second.
  await page.getByLabel('Advanced', { exact: true }).click();
  await wait(page, 600);
  await shot('03-numbers');
  await page.getByLabel('Back to the difficulties').click();
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 4. Today's four challenges, the other way in.
  await page.getByLabel('Daily', { exact: true }).click();
  await wait(page, 600);
  await shot('04-daily');
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 5. Settings, which outlive any one game.
  await page.getByLabel('Settings').click();
  await wait(page, 500);
  await shot('05-settings');
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 6. The briefing, which is what a game opens with: what went wrong and why
  // anybody wants it sorted out.
  await startPuzzle(page, 'Advanced', 1, true);
  await shot('06-briefing');
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);

  // 7. The board behind it.
  await shot('07-board');

  // 8. The menu, behind the burger: the one board setting and the three ways
  // to leave the puzzle behind.
  await page.getByLabel('Menu').click();
  await wait(page, 500);
  await shot('08-menu');
  await page.getByLabel('Back to the board').click();
  await wait(page, 400);

  // 9. The clue, in the window the Clue button opens, with the pair that moves
  // between the ones read.
  const puzzle = await puzzleInPlay(page);
  const clueButton = page.getByLabel('Clue', { exact: true });
  const nextClue = page.getByLabel('Next', { exact: true });
  const closeWindow = () => page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await clueButton.click();
  await wait(page, 600);
  await shot('09-clue');
  await closeWindow();
  await wait(page, 400);

  // 10. The same clue lit up on the grids it talks about, which is what the
  // button on the right of the row does.
  await page.getByLabel('Highlight', { exact: true }).click();
  await wait(page, 500);
  await shot('10-highlight');

  // Some marks on the board before the shots that need one. Nothing is marked
  // yet, so the button hands the clues over in order: one press is already
  // spent on clue 0, so `plain` more presses lands on it.
  const plain = puzzle.clues.findIndex((clue) => clue.kind === 'link');
  for (let index = 0; index < plain; index++) {
    await clueButton.click();
    await wait(page, 300);
    await nextClue.click();
    await wait(page, 400);
    await closeWindow();
    await wait(page, 250);
  }
  const link = puzzle.clues[plain];
  await mark(
    page,
    puzzle,
    link.a.category,
    link.a.item,
    link.b.category,
    link.b.item,
    link.positive ? 'matched' : 'ruled out',
  );
  await wait(page, 1000);

  // 11. The board marked up: what the player put there against what the board
  // worked out from it. The two are the same shape and the same colour and are
  // told apart by weight alone, so this is the shot that shows whether that
  // distinction survives at the size a square actually gets.
  await shot('11-marked');

  // 12. A board the answer can no longer be reached from, which is what the
  // clue button reports instead of handing over a clue.
  const wrongEntity = (puzzle.solution[1][0] + 1) % puzzle.size.items;
  await tick(page, puzzle, 0, puzzle.solution[0][0], 1, wrongEntity);
  // Asking for a *new* clue is what checks the board, so this is Clue and then
  // Next past the end of the ones already read.
  await clueButton.click();
  await wait(page, 400);
  await nextClue.click();
  await wait(page, 600);
  await shot('12-stuck');
  const rewind = page.getByLabel(/^Rewind/);
  if (await rewind.count()) {
    await rewind.click();
    await wait(page, 400);
  }

  // 13. Who one of the pictures on the board actually is: the card behind a tap,
  // where the traits the clues describe things by are written down. Shot before
  // the finish, since a finished game shows its result rather than the board.
  await page.locator('[aria-label^="About "]').first().click();
  await wait(page, 700);
  await shot('13-item-card');
  await page.locator('[aria-label="Close"]').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);

  // 14. Finished: the result is the screen, and the board is behind it.
  await solve(page, puzzle);
  await shot('14-solved');

  // 15. Statistics, shown with a sample history.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate((history) => {
    localStorage.clear();
    localStorage.setItem('logic-grid:history:v1', JSON.stringify(history));
  }, sampleHistory());
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 1200);
  await page.getByLabel('Statistics').click();
  await wait(page, 800);
  await shot('15-statistics', { fullPage: true });

  // 16. The setup screen in night colours, with a game waiting to be resumed.
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
  // The board only takes marks once a clue has been read, and the window it
  // arrives in has to be shut before the squares can be reached.
  await page.getByLabel('Clue', { exact: true }).click();
  await wait(page, 500);
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);
  // A few true pairings, so the card on the start page shows some progress.
  await solve(page, await puzzleInPlay(page), 3);
  await wait(page, 1000);
  // Leaving a puzzle lands on the list it was started from; the setup screen,
  // where the game it left waits, is one step further back.
  await page.getByLabel('Back to setup').click();
  await wait(page, 600);
  await page.getByLabel('Back to the difficulties').click();
  await wait(page, 900);
  await shot('16-night');

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
