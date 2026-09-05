#!/usr/bin/env node
/**
 * Draws the words on the launch screen.
 *
 *   npm run splash
 *
 * The splash the player sees is `src/screens/SplashScreen.tsx`, painted in the
 * colour they chose. This is the frame before that one: the launch screen iOS
 * and Android show from the moment the icon is pressed until React Native has
 * anything to say, which is a static picture baked in at build time and cannot
 * know whose phone it is on.
 *
 * So it is the same design in the default accent, and the two hand over without
 * a seam for anybody who has not changed the colour — and with one colour change
 * for anybody who has, which is the price of a launch screen that exists before
 * the settings have been read.
 *
 * The words are drawn white on nothing; `expo-splash-screen` puts them on the
 * background colour `app.json` gives it. Written at three times the size they
 * are shown at, which is what a phone with a 3× screen wants.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, 'assets', 'splash-icon.png');

/**
 * The same sizes `SplashScreen.tsx` sets, in the same order.
 *
 * They are written twice, which is not ideal and is the lesser of two evils: a
 * build script cannot import a TypeScript component, and the alternative — a
 * shared module of numbers — would put the design in a third place that neither
 * the screen nor this reads like. The check below is what keeps them together.
 */
const NAME = { size: 64, line: 76, tracking: -2, weight: '800ExtraBold' };
const BYLINE = { size: 16, line: 22, tracking: 0.3, weight: '600SemiBold', gap: 8 };

/** How wide the block comes out, which is what `app.json` sets `imageWidth` to. */
export const IMAGE_WIDTH = 290;

/** Drawn at three times the size it is shown at, for a 3× screen. */
const SCALE = 3;

const face = (weight) =>
  readFileSync(
    join(ROOT, 'node_modules', '@expo-google-fonts', 'outfit', weight, `Outfit_${weight}.ttf`),
  ).toString('base64');

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  await page.setContent(`<!doctype html>
<style>
  @font-face { font-family: Name; src: url(data:font/ttf;base64,${face(NAME.weight)}); }
  @font-face { font-family: Byline; src: url(data:font/ttf;base64,${face(BYLINE.weight)}); }
  html, body { margin: 0; background: transparent; }
  #block {
    display: inline-block;
    text-align: center;
    /* The name decides the width; the byline is a third of it. */
    white-space: nowrap;
  }
  #name {
    font-family: Name;
    font-size: ${NAME.size * SCALE}px;
    line-height: ${NAME.line * SCALE}px;
    letter-spacing: ${NAME.tracking * SCALE}px;
    color: #FFFFFF;
  }
  #byline {
    font-family: Byline;
    font-size: ${BYLINE.size * SCALE}px;
    line-height: ${BYLINE.line * SCALE}px;
    letter-spacing: ${BYLINE.tracking * SCALE}px;
    color: rgba(255, 255, 255, 0.82);
    margin-top: ${BYLINE.gap * SCALE}px;
  }
</style>
<div id="block">
  <div id="name">Deduction</div>
  <div id="byline">a game by Matt Smith</div>
</div>`);
  // Asked for by name and then waited on. `document.fonts.ready` alone resolves
  // before a face set this way has been applied, and everything measured under
  // it comes back as the fallback — which is how the name was first sized 46
  // points narrower than it really is.
  await page.evaluate(async () => {
    await document.fonts.load('100px Name');
    await document.fonts.load('100px Byline');
    await document.fonts.ready;
  });

  const block = page.locator('#block');
  const box = await block.boundingBox();
  // The name is what the block is as wide as, and what `imageWidth` is set from.
  const shown = Math.round(box.width / SCALE);
  if (Math.abs(shown - IMAGE_WIDTH) > 2) {
    console.error(
      `The words come out ${shown} points wide, not the ${IMAGE_WIDTH} app.json is told.`,
    );
    console.error('Change IMAGE_WIDTH here and `imageWidth` there together, or they will differ.');
    process.exitCode = 1;
    await browser.close();
    return;
  }

  await block.screenshot({ path: OUT, omitBackground: true });
  console.log(`  ✓ assets/splash-icon.png   ${Math.round(box.width)} × ${Math.round(box.height)}`);
  console.log(`    shown ${shown} points wide, which is what app.json's imageWidth says.`);
  await browser.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
