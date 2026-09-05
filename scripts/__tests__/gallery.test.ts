import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
const PHONE_SHOTS = join(DOCS, 'screenshots');
const IPAD_SHOTS = join(PHONE_SHOTS, 'ipad');

/** Every `<img src="…">` in a markdown file, in the order it appears. */
function imagesIn(file: string): string[] {
  const text = readFileSync(join(ROOT, file), 'utf8');
  return [...text.matchAll(/<img src="([^"]+)"/g)].map((found) => found[1]);
}

const pngsIn = (directory: string) =>
  readdirSync(directory)
    .filter((name) => name.endsWith('.png'))
    .sort();

/**
 * The galleries and the pictures they point at.
 *
 * `npm run screenshots` writes the PNGs and a person writes the captions, which
 * is two halves that can come apart without anything failing: renaming a
 * capture leaves a broken image in a table nobody re-reads, and it happened —
 * `20-lesson.png` became `20-lesson-briefing.png` and the link sat broken for a
 * commit. Neither the walkthrough nor the size walk would notice; both write
 * files and neither reads the markdown.
 */
describe('the screenshot galleries', () => {
  const GALLERIES = [
    { page: 'docs/screenshots.md', shots: PHONE_SHOTS, prefix: 'screenshots/' },
    { page: 'docs/ipad.md', shots: IPAD_SHOTS, prefix: 'screenshots/ipad/' },
  ];

  describe.each(GALLERIES)('$page', ({ page, shots, prefix }) => {
    const images = imagesIn(page);

    it('points at a picture that is really there, every time', () => {
      const missing = images.filter((src) => !existsSync(join(DOCS, src)));
      expect(missing).toEqual([]);
    });

    it('shows every picture the walk wrote, and no others', () => {
      const shown = images
        .filter((src) => src.startsWith(prefix))
        .map((src) => src.slice(prefix.length))
        .sort();
      expect(shown).toEqual(pngsIn(shots));
    });
  });

  /**
   * The two walks are the same walk at two sizes, so a screen added to one and
   * not the other is a screen somebody forgot to re-shoot.
   */
  it('walks the same screens on both devices', () => {
    expect(pngsIn(IPAD_SHOTS)).toEqual(pngsIn(PHONE_SHOTS));
  });

  /** And the README hands off to them rather than holding a stale copy. */
  it('is linked from the README, which keeps no pictures of its own', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('docs/screenshots.md');
    expect(readme).toContain('docs/ipad.md');
    expect(imagesIn('README.md')).toEqual([]);
  });
});
