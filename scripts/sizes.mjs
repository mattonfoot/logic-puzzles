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
    const sixth = await box(page, 'Puzzle 6');
    const pager = await box(page, 'Previous');
    const back = await box(page, 'Back to the difficulties');
    if (!sixth || !pager || !back) {
      complain('the numbered list is missing a row, its pager or its way back');
    } else {
      const clear = pager.top - sixth.bottom;
      // The foot of a real device eats the home indicator, which the browser
      // does not report, so clearing it here by less than that is scrolling
      // there.
      if (clear < phone.bottomInset) {
        complain(
          `puzzle 6 clears the pager by ${clear}pt, which the ${phone.bottomInset}pt home indicator would take`,
        );
      }
      if (back.bottom > phone.height) complain('the way back runs off the numbered list');
    }
    const over = await scrollers(page);
    if (over.length > 0) complain(`the numbered list scrolls by ${over.join(', ')}pt`);

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
