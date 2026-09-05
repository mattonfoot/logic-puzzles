import { type as scale } from '../theme';

/**
 * The sizes the app sets things in, and the order they stand in.
 *
 * Numbers get changed; the relationships between them are the design, and this
 * is where they are written down. `npm run sizes` is what holds the numbers
 * themselves honest — it opens every menu on five phones and fails on a label
 * that has wrapped — but it cannot say *why* a size is what it is, and a scale
 * that quietly loses its order is a scale nobody can reason about.
 */
describe('the type scale', () => {
  const STEPS = ['door', 'menu', 'menuLong', 'title', 'note'] as const;

  it('runs from the front door down to the quiet line', () => {
    // The three menu steps in order, and every one of them larger than the
    // heading over it: a choice is the thing on the screen being made, and a
    // title only says what the choices are about.
    expect(scale.door.fontSize).toBeGreaterThan(scale.menu.fontSize);
    expect(scale.menu.fontSize).toBeGreaterThan(scale.menuLong.fontSize);
    expect(scale.menuLong.fontSize).toBeGreaterThan(scale.title.fontSize);
    expect(scale.title.fontSize).toBeGreaterThan(scale.note.fontSize);
  });

  /**
   * The two menu sizes are one voice at two volumes. A list of lessons is the
   * same kind of question as a list of difficulties — it is only set smaller
   * because its answers are phrases rather than words — so it has to be drawn
   * the same way or it would read as a different kind of thing.
   */
  it('sets both menu steps in the same voice', () => {
    expect(scale.menuLong.fontWeight).toBe(scale.menu.fontWeight);
    expect(scale.menuLong.letterSpacing).toBe(scale.menu.letterSpacing);
    expect(scale.door.fontWeight).toBe(scale.menu.fontWeight);
    expect(scale.door.letterSpacing).toBe(scale.menu.letterSpacing);
  });

  it('gives every step room to breathe, and no step a line it cannot fill', () => {
    for (const step of STEPS) {
      const { fontSize, lineHeight } = scale[step];
      expect(lineHeight).toBeGreaterThan(fontSize);
      // Past about a line and a half the words stop reading as a paragraph and
      // start reading as a list of unrelated lines.
      expect(lineHeight).toBeLessThan(fontSize * 1.6);
    }
  });
});
