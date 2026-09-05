#!/usr/bin/env node
/**
 * Checks that every screen fits on every iPhone the app is built for.
 *
 *   npm run sizes
 *
 * The walkthrough in `screenshots.mjs` drives one phone, which is what a
 * picture wants and not what a layout wants: a screen that fits a 15 Pro can
 * still push its last row under the pager on an 11 Pro, and nothing would say
 * so. This walks the screens that hold a list — the ones with something to run
 * out of room — at five sizes, and fails when anything scrolls that should not
 * or runs off the bottom.
 *
 * It exports the app for itself. `--skip-build` reuses whatever is already in
 * `.screenshot-build`, which is worth it while iterating on a layout and is not
 * what CI does: the screenshot walk clears its own build away when it finishes,
 * so a run that leaned on it having left one behind would only work when the
 * walk had been told to skip building too.
 *
 * The browser reports no safe-area insets, so a device's notch and
 * home indicator are added on top of what is measured here — which is why the
 * numbered list is asked to clear the pager by that much and not merely to
 * touch it. `src/ui/__tests__/panel.test.ts` holds the arithmetic that decides
 * the panel's share of a real screen with its insets.
 */
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from 'playwright';

import { BUILD_DIR, run, serve, wait } from './screenshots.mjs';

/** The sizes iOS reports, in points, and the inset the foot loses on a device. */
const PHONES = [
  { name: 'iPhone SE (3rd generation)', width: 375, height: 667, bottomInset: 0 },
  { name: 'iPhone 11 Pro / 13 mini', width: 375, height: 812, bottomInset: 34 },
  { name: 'iPhone 14', width: 390, height: 844, bottomInset: 34 },
  { name: 'iPhone 15 Pro', width: 393, height: 852, bottomInset: 34 },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932, bottomInset: 34 },
];

const box = (page, label) =>
  page.evaluate((name) => {
    const found = document.querySelector(`[aria-label="${name}"]`);
    if (!found) return null;
    const { top, bottom } = found.getBoundingClientRect();
    return { top: Math.round(top), bottom: Math.round(bottom) };
  }, label);

/** Anything on the page that has more in it than it can show. */
const scrollers = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('div')]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 80)
      .map((el) => el.scrollHeight - el.clientHeight),
  );

async function main() {
  if (process.argv.includes('--skip-build')) {
    // Saying which build is missing beats a read stream's ENOENT on index.html.
    if (!existsSync(join(BUILD_DIR, 'index.html'))) {
      console.error(`No export to reuse in ${BUILD_DIR}. Run without --skip-build.`);
      process.exitCode = 1;
      return;
    }
  } else {
    await rm(BUILD_DIR, { recursive: true, force: true });
    await run('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', BUILD_DIR]);
  }

  const { server, origin } = await serve(BUILD_DIR);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });

  const problems = [];
  console.log('Checking every screen at every size:\n');

  for (const phone of PHONES) {
    const page = await browser.newPage({ viewport: { width: phone.width, height: phone.height } });
    const complain = (what) => problems.push(`${phone.name}: ${what}`);

    await page.goto(origin);
    await wait(page, 1600);

    // The front door, whose two doors and two foot links are the tallest thing
    // the bottom half carries anywhere.
    for (const door of ['Daily', 'Play', 'How to play', 'Settings', 'Statistics']) {
      const seen = await box(page, door);
      if (!seen) complain(`the front door has no ${door}`);
      else if (seen.bottom > phone.height)
        complain(`${door} runs off the bottom of the front door`);
    }

    // The two menus behind How to play: the same panel over the same half, so
    // the same question — does the list clear the way back?
    await page.getByLabel('How to play').click();
    await wait(page, 600);
    for (const name of ['Using deduction', 'Further deduction', 'Understanding clues']) {
      const seen = await box(page, name);
      if (!seen) complain(`the lessons menu has no ${name}`);
      else if (seen.bottom > phone.height) complain(`${name} runs off the lessons menu`);
    }
    await page.getByLabel('Understanding clues').click();
    await wait(page, 500);
    for (const name of [
      'Negative clues',
      'Comparison clues',
      'Grouped clues',
      'Compare the gap clues',
      'Vague clues',
    ]) {
      const seen = await box(page, name);
      if (!seen) complain(`the clue lessons have no ${name}`);
      else if (seen.bottom > phone.height) complain(`${name} runs off the clue lessons`);
    }
    const overLessons = await scrollers(page);
    if (overLessons.length > 0) complain(`the clue lessons scroll by ${overLessons.join(', ')}pt`);
    await page.getByLabel('Back').click();
    await wait(page, 400);
    await page.getByLabel('Back').click();
    await wait(page, 400);

    await page.getByLabel('Play', { exact: true }).click();
    await wait(page, 500);
    for (const difficulty of ['Beginner', 'Advanced', 'Expert', 'Pro']) {
      const seen = await box(page, difficulty);
      if (!seen) complain(`the difficulties have no ${difficulty}`);
      else if (seen.bottom > phone.height) complain(`${difficulty} runs off the difficulties`);
    }

    // The numbered list: six rows, the pager under them, and the way back under
    // that. This is the screen that decides how much of the phone the panel can
    // have, so it is checked hardest.
    await page.getByLabel('Advanced', { exact: true }).click();
    await wait(page, 700);
    // The last row on the page, whatever the page holds — asking for a numbered
    // one would only be asking how many there are, which is not this check's
    // business.
    const last = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[aria-label^="Puzzle "]')];
      if (rows.length === 0) return null;
      const bottom = Math.max(...rows.map((el) => el.getBoundingClientRect().bottom));
      return { count: rows.length, bottom: Math.round(bottom) };
    });
    const pager = await box(page, 'Previous');
    const back = await box(page, 'Back to the difficulties');
    if (!last || !pager || !back) {
      complain('the numbered list is missing a row, its pager or its way back');
    } else {
      const clear = pager.top - last.bottom;
      // The foot of a real device eats the home indicator, which the browser
      // does not report, so clearing it here by less than that is scrolling
      // there.
      if (clear < phone.bottomInset) {
        complain(
          `the last of ${last.count} rows clears the pager by ${clear}pt, which the ${phone.bottomInset}pt home indicator would take`,
        );
      }
      if (back.bottom > phone.height) complain('the way back runs off the numbered list');
    }
    const over = await scrollers(page);
    if (over.length > 0) complain(`the numbered list scrolls by ${over.join(', ')}pt`);

    // The board, zoomed until it is larger than the screen: the row and column
    // headings have to stay put while the grids slide under them, or the
    // player is left reading ticks with nothing to say what they are about.
    await page.getByLabel('Back to the difficulties').click();
    await wait(page, 400);
    await page.getByLabel('Pro', { exact: true }).click();
    await wait(page, 600);
    await page.getByLabel('Puzzle 1').click();
    await wait(page, 1600);
    await page.getByLabel('Close').click({ position: { x: 12, y: 12 } });
    await wait(page, 400);
    for (let press = 0; press < 12; press++) {
      const zoom = page.getByLabel('Zoom in');
      if (await zoom.isDisabled()) break;
      await zoom.click();
      await wait(page, 100);
    }
    await wait(page, 400);

    // Kept in document order and compared by position in it, never by name: a
    // set that is both a row and a column on the staircase — most of them —
    // heads two of these, and matching Seahorse to Seahorse pairs the wrong
    // two up.
    const headings = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[aria-label^="About "]')].map((el, at) => {
          const { x, y } = el.getBoundingClientRect();
          return { at, name: el.getAttribute('aria-label'), x: Math.round(x), y: Math.round(y) };
        }),
      );
    const before = await headings();
    // The column headings are the ones above every row heading; the row
    // headings are the ones left of every column heading.
    const top = Math.min(...before.map((h) => h.y));
    const left = Math.min(...before.map((h) => h.x));
    const columns = before.filter((h) => h.y === top);
    const rows = before.filter((h) => h.x === left && h.y > top);

    if (columns.length === 0 || rows.length === 0) {
      complain('the board has no headings to pin');
    } else {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('div')) {
          if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 100) el.scrollTop = 150;
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 100) el.scrollLeft = 150;
        }
      });
      await wait(page, 500);
      const after = await headings();

      const movedDown = columns.filter((h) => after[h.at] && after[h.at].y !== h.y);
      if (movedDown.length > 0) {
        complain(`the column headings scrolled out of the top (${movedDown[0].name})`);
      }
      const movedAcross = rows.filter((h) => after[h.at] && after[h.at].x !== h.x);
      if (movedAcross.length > 0) {
        complain(`the row headings scrolled off the left (${movedAcross[0].name})`);
      }
      // And each has to follow the grid on its own axis, or it would be pinned
      // to nothing: a column heading that never moves sideways is not above the
      // column it names.
      if (columns.every((h) => after[h.at] && after[h.at].x === h.x)) {
        complain('the column headings did not follow the grid sideways');
      }
      if (rows.every((h) => after[h.at] && after[h.at].y === h.y)) {
        complain('the row headings did not follow the grid down');
      }
    }

    console.log(
      `  ${problems.some((p) => p.startsWith(phone.name)) ? '✕' : '✓'} ${phone.name.padEnd(26)} ${phone.width} × ${phone.height}`,
    );
    await page.close();
  }

  await browser.close();
  server.close();

  if (problems.length > 0) {
    console.error('\nScreens that do not fit:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nEvery screen fits all ${PHONES.length} sizes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
