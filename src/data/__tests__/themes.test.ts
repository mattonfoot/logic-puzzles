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
  groupNot: ['{a}', '{b}'],
  either: ['{a}', '{b}', '{c}'],
  compare: ['{greater}', '{lesser}'],
  compareGap: ['{greater}', '{lesser}', '{gap}'],
};

const KNOWN_SLOTS = ['a', 'b', 'c', 'greater', 'lesser', 'noun', 'comparative', 'gap', 'unit'];

/** Deep enough that two puzzles on the same theme rarely share a cast. */
const MIN_POOL = 12;
/**
 * The board heads its rows and columns with pictures now rather than with
 * names, so a label is no longer squeezed sideways above a grid column — it is
 * read in a clue, on an item's card, and in the answer table, all of which have
 * a line to give it. The cap is what the answer table's name column can set
 * without shrinking the type: enough for a title and a name.
 */
const MAX_LABEL = 22;
/** The card has room for a line, and the player has patience for one. */
const MAX_BLURB = 100;
/**
 * Five things worth knowing about an item; more is a biography.
 *
 * It was four while every set of people was described the same three ways —
 * hair colour, eye colour, star sign — none of which a silhouette can show. The
 * people now carry two the drawing does show and three it does not, which is
 * what a card is for.
 */
const MAX_TRAITS = 5;
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

      it('describes every item: an icon, a line about it, and its traits', () => {
        for (const category of theme.categories) {
          expect(category.noun.length).toBeGreaterThan(0);
          expect(category.describes).toContain('{}');
          // The frames are rewritten into "no ..." and "a ..." for group and
          // either-or clues, which only works if the articles are written in.
          expect(category.describes.startsWith('the ')).toBe(true);

          expect(category.traits.length).toBeGreaterThan(0);
          expect(category.traits.length).toBeLessThanOrEqual(MAX_TRAITS);
          expect(new Set(category.traits.map((trait) => trait.id)).size).toBe(
            category.traits.length,
          );
          for (const trait of category.traits) {
            expect(trait.label.length).toBeGreaterThan(0);
            expect(trait.pattern).toContain('{}');
            expect(trait.pattern).toContain('{noun}');
          }

          for (const item of category.items) {
            expect(`${item.label}: ${item.icon}`).toMatch(/: .+$/);
            // A line, not an essay: it has a card to itself, not a page.
            expect(item.blurb.length).toBeGreaterThan(20);
            expect(item.blurb.length).toBeLessThanOrEqual(MAX_BLURB);
            expect(item.blurb).toMatch(/[.!?]$/);

            for (const trait of category.traits) {
              const value = item.traits[trait.id];
              expect(`${category.id}/${item.label}/${trait.id}: ${value}`).toMatch(/: .+$/);
            }
          }
        }
      });

      it('has traits worth describing things by: some shared, some not', () => {
        for (const category of theme.categories) {
          for (const trait of category.traits) {
            const counts = new Map<string, number>();
            for (const item of category.items) {
              const value = item.traits[trait.id];
              counts.set(value, (counts.get(value) ?? 0) + 1);
            }
            // A trait every item answers the same way describes nothing.
            expect(`${category.id}/${trait.id}`).toBeTruthy();
            expect(counts.size).toBeGreaterThan(1);
          }

          // Somewhere in the category there is a value two items share, or no
          // clue could ever talk about a group.
          const shared = category.traits.some((trait) => {
            const counts = new Map<string, number>();
            for (const item of category.items) {
              const value = item.traits[trait.id];
              counts.set(value, (counts.get(value) ?? 0) + 1);
            }
            return [...counts.values()].some((count) => count > 1);
          });
          expect(`${category.id} shares a trait value`).toBe(
            shared ? `${category.id} shares a trait value` : 'no shared trait value',
          );
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
