import { DEFAULT_CLUE_TEMPLATES, resolveClueTemplates } from '../../puzzle/describe';
import type { ClueTemplates } from '../../puzzle/types';
import { SIZES } from '../sizes';
import { THEMES, themeById } from '../themes';

/**
 * The slots each template must keep: leaving one out would quietly drop half
 * the clue, and the puzzle would stop being solvable from what the player reads.
 */
const REQUIRED_SLOTS: Record<keyof ClueTemplates, string[]> = {
  link: ['{a}', '{b}'],
  notLink: ['{a}', '{b}'],
  either: ['{a}', '{b}', '{c}'],
  compare: ['{greater}', '{lesser}'],
  compareGap: ['{greater}', '{lesser}', '{gap}'],
};

const KNOWN_SLOTS = ['a', 'b', 'c', 'greater', 'lesser', 'noun', 'comparative', 'gap', 'unit'];

/** Deep enough that two puzzles on the same theme rarely share a cast. */
const MIN_POOL = 12;
/** Item labels are written sideways above narrow grid columns. */
const MAX_LABEL = 14;
const BIGGEST_PUZZLE = Math.max(...SIZES.map((size) => size.items));

describe('themes', () => {
  it('has a voice of its own, or falls back to the neutral one', () => {
    const custom = THEMES.filter((theme) => theme.clues);
    expect(custom.length).toBeGreaterThan(0);

    // Two themes should not be saying the same thing.
    const links = new Set(THEMES.map((theme) => resolveClueTemplates(theme).link));
    expect(links.size).toBeGreaterThan(1);

    // And the defaults are still complete on their own.
    for (const slots of Object.values(REQUIRED_SLOTS)) {
      expect(slots.length).toBeGreaterThan(0);
    }
    expect(Object.keys(DEFAULT_CLUE_TEMPLATES).sort()).toEqual(Object.keys(REQUIRED_SLOTS).sort());
  });

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

      it('writes its clues in complete sentences, keeping every slot it needs', () => {
        const templates = resolveClueTemplates(theme);
        for (const [kind, slots] of Object.entries(REQUIRED_SLOTS)) {
          const template = templates[kind as keyof ClueTemplates];
          for (const slot of slots) {
            expect(`${kind}: ${template}`).toContain(slot);
          }
          expect(template.trim()).toBe(template);
          expect(template).toMatch(/[.!?]$/);

          // Only slots the writer knows how to fill.
          for (const [, name] of template.matchAll(/\{(\w+)\}/g)) {
            expect(KNOWN_SLOTS).toContain(name);
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
