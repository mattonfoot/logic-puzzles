#!/usr/bin/env node
/**
 * Checks that every screen fits on every phone the app is built for.
 *
 *   npm run sizes            both platforms
 *   npm run sizes -- --ios   the iPhones alone
 *   npm run sizes -- --android
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
 * `--headroom` answers the other question: not whether a menu fits, but how far
 * its words could still grow before it stopped. That is what `MENU_TYPE_CAP` is
 * set from — the smallest of those numbers, on the narrowest phone.
 *
 * The browser reports no safe-area insets, so a device's notch and
 * home indicator are added on top of what is measured here — which is why the
 * numbered list is asked to clear the pager by that much and not merely to
 * touch it. `src/ui/__tests__/panel.test.ts` holds the arithmetic that decides
 * the panel's share of a real screen with its insets.
 */
import { existsSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { BUILD_DIR, run, serve, wait } from './screenshots.mjs';

/**
 * How far the menus let their words grow, read out of the stylesheet rather
 * than written down again here: the cap is what keeps a menu that cannot
 * scroll from growing a row off the bottom, so the check has to be asking
 * about the same number the app is drawing with.
 */
const THEME = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'ui', 'theme.ts');
const MENU_TYPE_CAP = Number(
  /MENU_TYPE_CAP = ([\d.]+)/.exec(readFileSync(THEME, 'utf8'))?.[1] ?? NaN,
);
if (!Number.isFinite(MENU_TYPE_CAP)) throw new Error(`No MENU_TYPE_CAP in ${THEME}`);

/**
 * The phones, in the units each platform lays out in, with the inset the foot
 * loses to a gesture bar.
 *
 * iOS reports points; Android reports density-independent pixels, which are
 * the same thing by another name — a Pixel 8 is 1080 physical pixels across
 * and 412 of these. So the viewports below are comparable, and the Android
 * ones are narrower and shorter than anything Apple sells: 360 dp is the
 * width the layout has to survive, and it is 15 dp tighter than an SE.
 *
 * What this measures is geometry, which is all it ever measured — the walk
 * drives the web export in Chromium, so it catches a row that will not fit
 * and nothing that depends on being Android. The gesture bar is 24 dp where
 * iOS's home indicator is 34 pt.
 */
const PHONES = [
  { os: 'ios', name: 'iPhone SE (3rd generation)', width: 375, height: 667, bottomInset: 0 },
  { os: 'ios', name: 'iPhone 11 Pro / 13 mini', width: 375, height: 812, bottomInset: 34 },
  { os: 'ios', name: 'iPhone 14', width: 390, height: 844, bottomInset: 34 },
  { os: 'ios', name: 'iPhone 15 Pro', width: 393, height: 852, bottomInset: 34 },
  { os: 'ios', name: 'iPhone 15 Pro Max', width: 430, height: 932, bottomInset: 34 },
  // Android has a second scale the reader can turn up: display size, which
  // changes the dp the screen reports rather than the size of the words. A
  // 360 dp phone set two notches up reports about 320, which is the floor
  // Android itself uses for its smallest-width buckets.
  {
    os: 'android',
    name: 'Galaxy A14, display size large',
    width: 320,
    height: 711,
    bottomInset: 24,
  },
  // The narrowest width Play still sees in numbers, and the shortest with it.
  { os: 'android', name: 'Galaxy A14 / S21', width: 360, height: 800, bottomInset: 24 },
  { os: 'android', name: 'Pixel 4a', width: 393, height: 851, bottomInset: 24 },
  { os: 'android', name: 'Pixel 8', width: 412, height: 915, bottomInset: 24 },
  { os: 'android', name: 'Pixel 8 Pro', width: 448, height: 998, bottomInset: 24 },
  { os: 'android', name: 'Galaxy S24 Ultra', width: 480, height: 1060, bottomInset: 24 },
];

/** Which of them this run is about. */
const only = process.argv.includes('--ios')
  ? 'ios'
  : process.argv.includes('--android')
    ? 'android'
    : null;
const WALKING = only ? PHONES.filter((phone) => phone.os === only) : PHONES;

const box = (page, label) =>
  page.evaluate((name) => {
    const found = document.querySelector(`[aria-label="${name}"]`);
    if (!found) return null;
    const { top, bottom } = found.getBoundingClientRect();
    return { top: Math.round(top), bottom: Math.round(bottom) };
  }, label);

/**
 * How far a label has to stretch before the check will accept it.
 *
 * This used to be 1.35, iOS's xxxLarge, on the reasoning that the design has to
 * hold up to the largest of the ordinary text settings and that the
 * accessibility ones above it are a different request. That was the right line
 * while a menu could scroll. It is no longer the line the app draws: the menus
 * stand still now, so `MENU_TYPE_CAP` stops their words at a size every one of
 * them was measured to fit at, and nothing in a menu ever reaches 1.35.
 *
 * Asking about a size the app will not render is asking a question with no
 * answer in it, so the cap is the question. Raise the cap and this gets harder
 * on its own, which is the right way round.
 */
const DYNAMIC_TYPE = MENU_TYPE_CAP;

/**
 * Whether a label wraps onto a second line, at the size a phone would draw it.
 *
 * A menu with a two-line choice in it is a menu with a mistake in it — "Compare
 * the gap clues" was exactly that at the size the difficulties are set in — and
 * nothing else here would notice, since a wrapped label still fits the screen
 * and still clears everything under it.
 *
 * The lines are counted rather than measured: a range over the words reports one
 * rectangle per line box, so this asks the browser how many it drew instead of
 * inferring it from a height and a guess at what padding is on the button.
 *
 * What is new is the `scale`. The browser has one text size and a phone has
 * twelve: iOS multiplies every label by the reader's own setting, and React
 * Native lets it. Asking only what the browser draws at 1.0 is how both of the
 * menus behind How to play came to wrap on an iPhone 11 Pro while this script
 * reported that every screen fit. So the words are grown to the size the phone
 * would grow them to and the question is asked there — which is a real question
 * about this layout, since every box around the label is free to grow with it up
 * to the margin, exactly as it is on the device.
 */
const wrapsAt = (page, label, scale) =>
  page.evaluate(
    ({ name, factor }) => {
      const found = document.querySelector(`[aria-label="${name}"]`);
      if (!found) return false;
      // The words themselves, not the button around them: a range over the
      // pressable would span its picture and its padding and report a line box
      // for each. This is the innermost element holding the whole label.
      const text = [found, ...found.querySelectorAll('*')]
        .reverse()
        .find((el) => el.children.length === 0 && el.textContent.trim() === name);
      if (!text) return false;
      // A label that shrinks to fit cannot wrap, and React Native Web does not
      // implement the shrinking — so the browser would report a second line
      // the phone never draws. The overflow check still covers these.
      if (text.closest('[data-testid="door-label"]')) return false;

      const own = text.style.fontSize;
      const drawn = parseFloat(getComputedStyle(text).fontSize);
      text.style.fontSize = `${drawn * factor}px`;
      const range = document.createRange();
      range.selectNodeContents(text);
      const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
      text.style.fontSize = own;
      return lines.size > 1;
    },
    { name: label, factor: scale },
  );

/** The two questions every label is asked, said the same way each time. */
async function tooTight(page, label) {
  if (await wrapsAt(page, label, 1)) return `${label} wraps onto two lines`;
  if (await wrapsAt(page, label, DYNAMIC_TYPE))
    return `${label} wraps at ${DYNAMIC_TYPE}×, which is a phone set one or two notches above the default`;
  return null;
}

/**
 * Anything on the page with more in it than it can show, at the size a phone
 * would draw it.
 *
 * No menu scrolls any more, so this is no longer a question about a scroll bar:
 * a list that outgrows its box now loses its last row off the bottom with
 * nothing to drag. The words are grown the way `wrapsAt` grows them, both the
 * size and the leading, since iOS scales a line's height with its letters and
 * React Native sets both in points.
 */
const overflowing = (page, scale = 1) =>
  page.evaluate((factor) => {
    const all = [...document.querySelectorAll('*')];
    // Measured first, then applied: setting a parent's size changes what the
    // browser computes for its children, and growing that again compounds.
    const own = all.map((el) => {
      const style = getComputedStyle(el);
      return {
        el,
        was: { size: el.style.fontSize, height: el.style.lineHeight },
        size: parseFloat(style.fontSize),
        height: parseFloat(style.lineHeight),
      };
    });
    if (factor !== 1) {
      for (const { el, size, height } of own) {
        if (size) el.style.fontSize = `${size * factor}px`;
        if (height) el.style.lineHeight = `${height * factor}px`;
      }
    }
    // The panel over a menu sizes the app's own name with
    // `adjustsFontSizeToFit`, which React Native Web does not implement: the
    // phone shrinks the word, the browser reports two points of overflow.
    const panel = document.querySelector('[data-testid="title-panel"]');
    const over = [...document.querySelectorAll('div')]
      .filter((el) => !panel?.contains(el))
      .filter((el) => el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 80)
      .map((el) => el.scrollHeight - el.clientHeight);
    if (factor !== 1) {
      for (const { el, was } of own) {
        el.style.fontSize = was.size;
        el.style.lineHeight = was.height;
      }
    }
    return over;
  }, scale);

/**
 * Run with `--headroom` to be told, instead, how far each menu's words can grow
 * before it stops fitting. That is the number `MENU_TYPE_CAP` is set from, and
 * the only way to know it is to measure it on every phone.
 */
const HEADROOM = process.argv.includes('--headroom');

/** The largest multiplier this screen still fits at, to two decimal places. */
async function headroom(page) {
  if ((await overflowing(page)).length > 0) return 1;
  let fits = 1;
  let over = 3;
  while (over - fits > 0.01) {
    const mid = (fits + over) / 2;
    if ((await overflowing(page, mid)).length > 0) over = mid;
    else fits = mid;
  }
  return fits;
}

/**
 * How much screen is left under the way back.
 *
 * It is the last thing on every screen and it belongs at the foot of one,
 * where the thumb is and where it sits on the settings and the statistics.
 * A list that no longer fills its half leaves it floating under the last
 * choice with the rest of the screen empty beneath it, which is what happened
 * the day the menus stopped scrolling: the view that replaced the ScrollView
 * was only as tall as its rows.
 *
 * Measured against the window rather than a container, since the question is
 * where it lands on the phone. The browser reports no home indicator, so what
 * is left is the bar's own padding and nothing else.
 */
const FOOT = 24;

async function atTheFoot(page, where, complain) {
  const back = await box(page, 'Back');
  if (!back) return complain(`${where} has no way back`);
  const under = Math.round((await page.viewportSize()).height - back.bottom);
  if (under > FOOT) complain(`${where} leaves ${under}pt under the way back`);
}

/**
 * The question every menu is asked, now that none of them scroll: does all of
 * it fit, at the size it is drawn and at the largest ordinary text setting?
 */
async function fits(page, where, complain) {
  if (HEADROOM) {
    const most = await headroom(page);
    console.log(`    ${where.padEnd(24)} fits up to ${most.toFixed(2)}\u00d7`);
    return;
  }
  const now = await overflowing(page);
  if (now.length > 0) complain(`${where} overflows by ${now.join(', ')}pt`);
  const grown = await overflowing(page, MENU_TYPE_CAP);
  if (grown.length > 0)
    complain(
      `${where} overflows by ${grown.join(', ')}pt at ${MENU_TYPE_CAP}\u00d7, which the menus allow`,
    );
}

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

  for (const phone of WALKING) {
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
      else {
        const tight = await tooTight(page, door);
        if (tight) complain(`${tight}, on the front door`);
      }
    }
    await fits(page, 'the front door', complain);

    // Today's five boards, which is a menu like any other: one row a size, the
    // streak over them, the way back under.
    await page.getByLabel('Daily', { exact: true }).click();
    await wait(page, 600);
    await fits(page, 'the daily list', complain);
    await atTheFoot(page, 'the daily list', complain);
    await page.getByLabel('Back').click();
    await wait(page, 400);

    // The two menus behind How to play: the same panel over the same half, so
    // the same question — does the list clear the way back?
    await page.getByLabel('How to play').click();
    await wait(page, 600);
    for (const name of ['Using deduction', 'Further deduction', 'Understanding clues']) {
      const seen = await box(page, name);
      if (!seen) complain(`the lessons menu has no ${name}`);
      else if (seen.bottom > phone.height) complain(`${name} runs off the lessons menu`);
      else {
        const tight = await tooTight(page, name);
        if (tight) complain(`${tight}, on the lessons menu`);
      }
    }
    await fits(page, 'the lessons menu', complain);
    await atTheFoot(page, 'the lessons menu', complain);
    await page.getByLabel('Understanding clues').click();
    await wait(page, 500);
    for (const name of [
      'Negative clues',
      'Ordering clues',
      'Grouped clues',
      'Comparison clues',
      'Vague clues',
    ]) {
      const seen = await box(page, name);
      if (!seen) complain(`the clue lessons have no ${name}`);
      else if (seen.bottom > phone.height) complain(`${name} runs off the clue lessons`);
      else {
        const tight = await tooTight(page, name);
        if (tight) complain(`${tight}, on the clue lessons`);
      }
    }
    await fits(page, 'the clue lessons', complain);
    await atTheFoot(page, 'the clue lessons', complain);
    await page.getByLabel('Back').click();
    await wait(page, 400);
    await page.getByLabel('Back').click();
    await wait(page, 400);

    await page.getByLabel('Play', { exact: true }).click();
    await wait(page, 500);

    // The two ways of playing, which Play asks before anything else. Both names
    // are phrases rather than words, so they are set at the lessons' size and
    // have the same question asked of them.
    for (const mode of ['Pure Deduction', 'Classic logic']) {
      const seen = await box(page, mode);
      if (!seen) complain(`the ways of playing have no ${mode}`);
      else if (seen.bottom > phone.height) complain(`${mode} runs off the ways of playing`);
      else {
        const tight = await tooTight(page, mode);
        if (tight) complain(`${tight}, on the ways of playing`);
      }
    }
    await fits(page, 'the ways of playing', complain);
    await atTheFoot(page, 'the ways of playing', complain);

    await page.getByLabel('Pure Deduction', { exact: true }).click();
    await wait(page, 500);
    for (const difficulty of ['Beginner', 'Advanced', 'Expert', 'Pro', 'Legend']) {
      const seen = await box(page, difficulty);
      if (!seen) complain(`the difficulties have no ${difficulty}`);
      else if (seen.bottom > phone.height) complain(`${difficulty} runs off the difficulties`);
      else {
        const tight = await tooTight(page, difficulty);
        if (tight) complain(`${tight}, on the difficulties`);
      }
    }
    await fits(page, 'the difficulties', complain);
    await atTheFoot(page, 'the difficulties', complain);

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
    const back = await box(page, 'Back');
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
    await fits(page, 'the numbered list', complain);
    await atTheFoot(page, 'the numbered list', complain);

    // The board, zoomed until it is larger than the screen: the row and column
    // headings have to stay put while the grids slide under them, or the
    // player is left reading ticks with nothing to say what they are about.
    await page.getByLabel('Back').click();
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
      // Whether the board had anywhere to scroll on each axis. On the largest
      // phone the biggest board can fit without scrolling at all, and a heading
      // that never moves because nothing moved says nothing about its pinning.
      const scrolled = await page.evaluate(() => {
        let down = false;
        let across = false;
        for (const el of document.querySelectorAll('div')) {
          if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 100) {
            el.scrollTop = 150;
            down ||= el.scrollTop > 0;
          }
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 100) {
            el.scrollLeft = 150;
            across ||= el.scrollLeft > 0;
          }
        }
        return { down, across };
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
      if (scrolled.across && columns.every((h) => after[h.at] && after[h.at].x === h.x)) {
        complain('the column headings did not follow the grid sideways');
      }
      if (scrolled.down && rows.every((h) => after[h.at] && after[h.at].y === h.y)) {
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
  console.log(`\nEvery screen fits all ${WALKING.length} sizes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
