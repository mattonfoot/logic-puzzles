/**
 * Regenerates the screenshots `docs/screenshots.md` links to.
 *
 *   npm run screenshots
 *   npm run screenshots:ipad
 *
 * It exports the app for web, serves that build, drives it in Chromium at
 * iPhone proportions and writes PNGs to docs/screenshots. Run it whenever the
 * UI changes so the reference in that file matches the build.
 *
 * `--ipad` walks exactly the same screens at 834 × 1194 and writes them to
 * `docs/screenshots/ipad`, which is what `docs/ipad.md` shows. Nothing about
 * the app is different there — that is the point of taking them.
 *
 * The browser comes from Playwright's own download (installed with the dev
 * dependencies). Set PLAYWRIGHT_CHROMIUM_PATH to point at another binary.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const BUILD_DIR = join(ROOT, '.screenshot-build');
const SHOTS_DIR = join(ROOT, 'docs', 'screenshots');

/**
 * The two shapes the same walk is driven at.
 *
 * The phone is a 15 Pro, which is the middle of the range the app is built
 * for. The iPad is an 11-inch Pro in portrait, which is the only orientation
 * it has: `app.json` sets `orientation: portrait`, so a tablet gets the tall
 * shape or nothing.
 */
const DEVICES = {
  phone: { viewport: { width: 393, height: 852 }, out: SHOTS_DIR },
  ipad: { viewport: { width: 834, height: 1194 }, out: join(SHOTS_DIR, 'ipad') },
};

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

export const wait = (page, ms) => page.waitForTimeout(ms);

export function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

export async function serve(directory) {
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

/**
 * A handful of finished games, so the statistics screen has something to show.
 *
 * The seeds are packed the way the app packs them — the number, then the
 * difficulty, then the way it was played, or the date for a daily — because the
 * statistics read all of that back out of the seed rather than off a field.
 * Two of these are Classic logic games and two are dailies, so the screen shows
 * the tabs that keep the three sets of times apart.
 */
function sampleHistory() {
  const day = 86_400_000;
  const now = Date.now();
  const COLUMN = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4 };
  const MODE = { pure: 0, classic: 1 };
  // A daily's seed is the day it was set, then the difficulty; a numbered game's
  // is the number, the difficulty and the way it was played.
  const dayNumber = (date) =>
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const seedFor = (number, sizeId, mode, finishedAt) =>
    mode === 'daily'
      ? dayNumber(new Date(finishedAt)) * 10 + COLUMN[sizeId]
      : (number * 10 + COLUMN[sizeId]) * 10 + MODE[mode];
  // Newest first, getting quicker over time so the trend has something to say.
  const games = [
    ['cosmic', 'Cosmic Voyage', 'sm', '4 × 4', 214, 7, 0, 'pure'],
    ['reef', 'Reef Dive', 'sm', '4 × 4', 236, 9, 0, 'pure'],
    ['cafe', 'Corner Café', 'sm', '4 × 4', 259, 8, 1, 'pure'],
    ['quest', 'Mythic Quest', 'sm', '4 × 4', 288, 10, 1, 'pure'],
    ['garden', 'Blue Ribbon Garden', 'sm', '4 × 4', 300, 9, 2, 'pure'],
    ['cosmic', 'Cosmic Voyage', 'sm', '4 × 4', 310, 12, 2, 'pure'],
    ['reef', 'Reef Dive', 'sm', '4 × 4', 325, 11, 3, 'pure'],
    ['quest', 'Mythic Quest', 'sm', '4 × 4', 340, 12, 3, 'pure'],
    ['cafe', 'Corner Café', 'md', '5 × 4', 412, 10, 4, 'pure'],
    ['garden', 'Blue Ribbon Garden', 'sm', '4 × 4', 494, 13, 4, 'classic'],
    ['quest', 'Mythic Quest', 'sm', '4 × 4', 551, 14, 6, 'classic'],
    ['cosmic', 'Cosmic Voyage', 'xs', '3 × 3', 96, 4, 5, 'pure'],
    ['reef', 'Reef Dive', 'sm', '4 × 4', 268, 8, 1, 'daily'],
    ['cafe', 'Corner Café', 'sm', '4 × 4', 281, 9, 2, 'daily'],
  ];
  return {
    version: 1,
    games: games.map(
      ([themeId, themeName, sizeId, sizeLabel, seconds, cluesUsed, daysAgo, mode], index) => {
        const finishedAt = now - daysAgo * day - index * 3_600_000;
        return {
          seed: seedFor(index + 1, sizeId, mode, finishedAt),
          themeId,
          themeName,
          themeIcon: `${themeId}/theme`,
          sizeId,
          sizeLabel,
          difficulty: { xs: 'Beginner', sm: 'Advanced', md: 'Expert', lg: 'Pro' }[sizeId],
          seconds,
          cluesUsed,
          revealed: false,
          finishedAt,
        };
      },
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
async function startPuzzle(
  page,
  difficulty = 'Advanced',
  number = 1,
  keepBriefing = false,
  mode = 'Pure Deduction',
) {
  await page.getByLabel('Play', { exact: true }).click();
  await wait(page, 500);
  // Which way it is being played comes before how big it is: the two are
  // separate lists of numbers, and the choice is in the seed.
  await page.getByLabel(mode, { exact: true }).click();
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
 * on purpose rather than at random. Saving starts with the first clue — a
 * board nobody has started leaves nothing behind — so this is only worth
 * asking once a clue has been read.
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
    if (label === null) return;
    // What the square is showing is the part after the colon and before
    // anything else the board has to add — a flagged square says so on the end
    // of its own label, and a run that matched the whole string would cycle
    // such a square forever looking for a state it was already in.
    const showing = label.slice(label.indexOf(': ') + 2).split(',')[0];
    if (showing === want) return;
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
  const device = process.argv.includes('--ipad') ? DEVICES.ipad : DEVICES.phone;
  if (!skipBuild) {
    await rm(BUILD_DIR, { recursive: true, force: true });
    await run('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', BUILD_DIR]);
  }

  await mkdir(device.out, { recursive: true });
  // Yesterday's pictures go before today's are taken. A renamed shot otherwise
  // leaves the old file sitting in the folder looking exactly as current as the
  // rest of them, and the walk's own count says 46 where it means 24. The iPad
  // shots live in a folder of their own, so a phone walk never touches them.
  for (const name of await readdir(device.out)) {
    if (name.endsWith('.png')) await rm(join(device.out, name));
  }
  const { server, origin } = await serve(BUILD_DIR);

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: device.viewport, deviceScaleFactor: 2 });
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));

  const shot = async (name, options = {}) => {
    await page.screenshot({ path: join(device.out, `${name}.png`), ...options });
    console.log(`  ✓ ${name}.png`);
  };

  console.log('Capturing screens:');

  // 1. The start page: the three places the app goes.
  await fresh(page, origin);
  await shot('01-start');

  // 18-23. How to play, under Play on the front door: the two menus of lessons
  // and a lesson worked through its first step. Taken here, in day colours,
  // because they are the first thing a new player opens; they are numbered last
  // because they were added last.
  await page.getByLabel('How to play').click();
  await wait(page, 600);
  await shot('19-lessons');

  await page.getByLabel('Understanding clues').click();
  await wait(page, 500);
  await shot('20-clue-lessons');

  // The grouped lesson: the one whose clues describe people instead of naming
  // them, which is the most a clue ever asks of a reader. It opens on its own
  // briefing, in the window a puzzle tells its story in.
  await page.getByLabel('Grouped clues').click();
  await wait(page, 700);
  await shot('21-lesson-briefing');

  // Clue hands over the clue and what to do with it — the window a lesson is
  // actually driven from.
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);
  await page.getByLabel('Clue').click();
  await wait(page, 600);
  await shot('22-lesson-clue');

  // Then the board, with the ring on the square being waited for.
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);
  const lessonSquare = (customer, drink) =>
    page.getByRole('button', { name: new RegExp(`^${customer} and ${drink}: `) });
  await lessonSquare('Ms Barley', 'Latte').click();
  await wait(page, 500);
  await shot('23-lesson-board');

  // And Clue again reads the board: right, so it moves straight on.
  await page.getByLabel('Clue').click();
  await wait(page, 600);
  await shot('24-lesson-next');

  // Leaving part-way through asks first, since the walk starts over next time.
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 400);
  await page.getByLabel('Leave it').click();
  await wait(page, 500);
  await page.getByLabel('Back').click();
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 500);

  // 2. The two ways a numbered game can be played, which is the first thing
  // Play asks: whether the board keeps the bookkeeping or the player does.
  await page.getByLabel('Play', { exact: true }).click();
  await wait(page, 500);
  await shot('02-mode');

  // 3. The difficulties, the next of the things a player chooses.
  await page.getByLabel('Pure Deduction', { exact: true }).click();
  await wait(page, 500);
  await shot('03-setup');

  // 4. The numbered games at that difficulty, which is the second.
  await page.getByLabel('Advanced', { exact: true }).click();
  await wait(page, 600);
  await shot('04-numbers');
  await page.getByLabel('Back to the difficulties').click();
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 400);
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 5. Today's four challenges, the other way in.
  await page.getByLabel('Daily', { exact: true }).click();
  await wait(page, 600);
  await shot('05-daily');
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 6. Settings, which outlive any one game.
  await page.getByLabel('Settings').click();
  await wait(page, 500);
  await shot('06-settings');
  await page.getByLabel('Back').click();
  await wait(page, 400);

  // 7. The briefing, which is what a game opens with: what went wrong and why
  // anybody wants it sorted out.
  await startPuzzle(page, 'Advanced', 1, true);
  await shot('07-briefing');
  await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);

  // 8. The board behind it.
  await shot('08-board');

  // 9. The menu, behind the burger: the one board setting and the three ways
  // to leave the puzzle behind.
  await page.getByLabel('Menu').click();
  await wait(page, 500);
  await shot('09-menu');
  await page.getByLabel('Back to the board').click();
  await wait(page, 400);

  // 10. The clue, in the window the Clue button opens, with the pair that moves
  // between the ones read.
  const clueButton = page.getByLabel('Clue', { exact: true });
  const nextClue = page.getByLabel('Next', { exact: true });
  const closeWindow = () => page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
  await clueButton.click();
  await wait(page, 600);
  await shot('10-clue');
  await closeWindow();
  await wait(page, 400);
  // The first clue is what starts the game, and the save with it.
  const puzzle = await puzzleInPlay(page);

  // 11. The same clue lit up on the grids it talks about, which is what the
  // button on the right of the row does.
  await page.getByLabel('Highlight', { exact: true }).click();
  await wait(page, 500);
  await shot('11-highlight');

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

  // 12. The board marked up: what the player put there against what the board
  // worked out from it. The two are the same shape and the same colour and are
  // told apart by weight alone, so this is the shot that shows whether that
  // distinction survives at the size a square actually gets.
  await shot('12-marked');

  // 13. A board whose marks disagree with each other, which is what the clue
  // button reports instead of handing over a clue.
  //
  // Two ticks in one row does it, on any puzzle and without knowing the answer:
  // whoever that is, they cannot have ordered both. A single *wrong* tick would
  // not — and must not, or the board would be telling the player which of their
  // guesses to keep.
  const person = puzzle.solution[0][0];
  await tick(page, puzzle, 0, person, 1, 0);
  await tick(page, puzzle, 0, person, 1, 1);
  // Asking for a *new* clue is what checks the board, so this is Clue and then
  // Next past the end of the ones already read.
  await clueButton.click();
  await wait(page, 400);
  await nextClue.click();
  await wait(page, 600);
  await shot('13-stuck');
  const rewind = page.getByLabel(/^Rewind/);
  if (await rewind.count()) {
    await rewind.click();
    await wait(page, 400);
  }
  // Rewind walks back to the last board that *held together*, and a single tick
  // holds together however wrong it is — so it stops with the first of the two
  // still down. That is the button behaving, not misbehaving: the game shades
  // marks that disagree with each other and never with the answer, so it cannot
  // know that one is wrong. The walk knows, because it put it there, so it takes
  // it back itself. Without this the board goes into the finish with a tick the
  // answer does not have, and cannot be solved.
  await page.getByLabel('Undo', { exact: true }).click();
  await wait(page, 400);

  // 14. Who one of the pictures on the board actually is: the card behind a tap,
  // where the traits the clues describe things by are written down. Shot before
  // the finish, since a finished game shows its result rather than the board.
  await page.locator('[aria-label^="About "]').first().click();
  await wait(page, 700);
  await shot('14-item-card');
  await page.locator('[aria-label="Close"]').click({ position: { x: 12, y: 12 } });
  await wait(page, 400);

  // 15. Finished: the result is the screen, and the board is behind it.
  await solve(page, puzzle);
  // Checked rather than assumed. The walk is the only thing that looks at these
  // pictures before they are committed, and a finish that quietly did not
  // happen leaves a shot of a half-marked board called `15-solved` — which is
  // exactly what three commits of this gallery carried.
  if (!(await page.getByText('Solved!', { exact: true }).count())) {
    throw new Error('the walk did not finish the puzzle: 15-solved would not be the finish');
  }
  await shot('15-solved');

  // 16. Statistics, shown with a sample history.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate((history) => {
    localStorage.clear();
    localStorage.setItem('logic-grid:history:v1', JSON.stringify(history));
  }, sampleHistory());
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 1200);
  await page.getByLabel('Statistics').click();
  await wait(page, 800);
  await shot('16-statistics', { fullPage: true });

  // 17. The setup screen in night colours, with a game waiting to be resumed.
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
  await shot('17-night');

  // The catalogue zoomed out twice: rows of thirty-six puzzles apiece.
  await page.getByLabel('Advanced', { exact: true }).click();
  await wait(page, 600);
  await page.getByLabel('Zoom out').click();
  await wait(page, 300);
  await page.getByLabel('Zoom out').click();
  await wait(page, 500);
  await shot('18-catalogue');

  await browser.close();
  server.close();

  if (problems.length > 0) {
    console.error('\nThe app logged errors while being captured:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }

  const written = (await readdir(device.out)).filter((file) => file.endsWith('.png'));
  const where = device === DEVICES.ipad ? 'docs/screenshots/ipad' : 'docs/screenshots';
  console.log(`\n${written.length} screenshots in ${where}.`);
  if (!skipBuild) await rm(BUILD_DIR, { recursive: true, force: true });
}

// Guarded so `scripts/sizes.mjs` can borrow the server and the exporter above
// without walking eighteen screens on the way in.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
