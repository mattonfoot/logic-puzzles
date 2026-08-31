import { SETTLED_TINT } from '../../components/GridBoard';
import { ACCENTS } from '../accents';
import { resolvePalette } from '../ThemeProvider';
import { contrast, type Palette } from '../theme';

/**
 * WCAG's floor for something you have to see but do not have to read. A mark on
 * the board is a shape rather than a word, so 3:1 is the bar rather than 4.5:1 —
 * but it is a bar the whole game rests on, because a tick you cannot pick out
 * from the square under it is a puzzle you cannot check your own working on.
 */
const FLOOR = 3;

/**
 * What a tinted square actually looks like.
 *
 * `tint` returns an `rgba(...)`, and the block it is painted in sets no
 * background of its own, so a matched square is the accent at that alpha
 * composited over **the page** — not over `boardLight`. Reading the contrast
 * against the board's own squares flatters it by about a point, which is enough
 * to turn a colour that fails into one that looks fine on paper.
 */
function over(hex: string, alpha: number, ground: string): string {
  const channels = (value: string) => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16));
  const [r1, g1, b1] = channels(hex);
  const [r2, g2, b2] = channels(ground);
  const blend = (a: number, b: number) => Math.round(b + (a - b) * alpha);
  return `#${[blend(r1, r2), blend(g1, g2), blend(b1, b2)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Every mark the board can draw, and the square it can be drawn on. */
function pairs(palette: Palette): { what: string; mark: string; cell: string }[] {
  const yes = over(palette.accent, SETTLED_TINT, palette.bg);
  const wrong = over(palette.danger, SETTLED_TINT, palette.bg);
  const crosshair = over(palette.accent, 0.07, palette.bg);
  return [
    { what: 'tick on a matched square', mark: palette.accent, cell: yes },
    { what: 'wrong tick', mark: palette.danger, cell: wrong },
    { what: 'wrong cross', mark: palette.danger, cell: wrong },
    { what: 'cross on the light square', mark: palette.inkSoft, cell: palette.boardLight },
    { what: 'cross on the shaded square', mark: palette.inkSoft, cell: palette.boardShade },
    { what: 'cross on a highlighted square', mark: palette.inkSoft, cell: crosshair },
  ];
}

describe('marks on the board', () => {
  for (const accent of ACCENTS) {
    for (const scheme of ['day', 'night'] as const) {
      const palette = resolvePalette(scheme, scheme === 'night', accent.id);

      for (const { what, mark, cell } of pairs(palette)) {
        it(`${accent.id} ${scheme}: the ${what} clears ${FLOOR}:1`, () => {
          expect(contrast(mark, cell)).toBeGreaterThanOrEqual(FLOOR);
        });
      }
    }
  }

  /**
   * The distinction the player actually reads is weight, not colour: a hand
   * mark and an automatic one are the same ink, so neither can be the faint one
   * that fails. This is what stops the old shortcut — draw the automatic mark in
   * `accentSoft` and hope — from creeping back in.
   */
  it('does not lean on the quiet half of the colour to mark up the board', () => {
    const board = require('fs').readFileSync('src/components/GridBoard.tsx', 'utf8');
    expect(board).not.toContain('accentSoft');
    expect(board).not.toContain('inkFaint');
  });
});
