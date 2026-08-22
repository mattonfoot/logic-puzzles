import { SIZES } from '../sizes';
import { THEMES, themeById } from '../themes';

/** Deep enough that two puzzles on the same theme rarely share a cast. */
const MIN_POOL = 12;
/** Item labels are written sideways above narrow grid columns. */
const MAX_LABEL = 14;
const BIGGEST_PUZZLE = Math.max(...SIZES.map((size) => size.items));

describe('themes', () => {
  it('offers several themes to draw from', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
    expect(themeById(THEMES[0].id)).toBe(THEMES[0]);
    expect(() => themeById('nope')).toThrow();
  });

  for (const theme of THEMES) {
    describe(theme.name, () => {
      it('has enough categories for the biggest puzzle', () => {
        const widest = Math.max(...SIZES.map((size) => size.categories));
        expect(theme.categories.length).toBeGreaterThanOrEqual(widest);
        expect(new Set(theme.categories.map((c) => c.id)).size).toBe(theme.categories.length);
      });

      it('names the people plainly, so clues read as sentences', () => {
        expect(theme.categories[0].pattern).toBe('{}');
        for (const category of theme.categories) {
          expect(category.pattern).toContain('{}');
        }
      });

      it('gives every category a deep pool of distinct, short items', () => {
        for (const category of theme.categories) {
          expect(category.items.length).toBeGreaterThanOrEqual(MIN_POOL);
          // Far more than any one puzzle uses, which is what makes the draw fresh.
          expect(category.items.length).toBeGreaterThan(BIGGEST_PUZZLE);

          const labels = category.items.map((item) => item.label);
          expect(new Set(labels).size).toBe(labels.length);
          for (const label of labels) {
            expect(label.length).toBeGreaterThan(0);
            expect(label.length).toBeLessThanOrEqual(MAX_LABEL);
          }
        }
      });

      it('has an ordered category with distinct, increasing values', () => {
        const ordered = theme.categories.filter((category) => category.ordered);
        expect(ordered.length).toBeGreaterThanOrEqual(1);

        for (const category of ordered) {
          const values = category.items.map((item) => item.value as number);
          expect(values.every((value) => typeof value === 'number')).toBe(true);
          expect(new Set(values).size).toBe(values.length);
          expect(values).toEqual([...values].sort((a, b) => a - b));
          expect(category.ordered!.unit.length).toBeGreaterThan(0);
        }
      });
    });
  }
});
