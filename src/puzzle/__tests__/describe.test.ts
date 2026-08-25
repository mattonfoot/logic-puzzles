import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import {
  DEFAULT_CLUE_TEMPLATES,
  clueAttributes,
  clueIcon,
  describeClue,
  resolveClueTemplates,
} from '../describe';
import { generatePuzzle } from '../generator';
import type { Clue, Puzzle, ThemeDef } from '../types';

const theme: ThemeDef = {
  id: 'test',
  name: 'Test',
  emoji: '🧪',
  blurb: 'For the tests',
  accent: '#000000',
  categories: [
    {
      id: 'person',
      name: 'Person',
      pattern: '{}',
      items: [{ label: 'Ann' }, { label: 'Bo' }, { label: 'Cy' }],
    },
    {
      id: 'pet',
      name: 'Pet',
      pattern: 'the {} owner',
      items: [{ label: 'Cat' }, { label: 'Dog' }, { label: 'Newt' }],
    },
    {
      id: 'age',
      name: 'Age',
      pattern: 'the {} year old',
      items: [
        { label: '7', value: 7 },
        { label: '9', value: 9 },
        { label: '11', value: 11 },
      ],
      ordered: { noun: 'age', unit: 'years', greater: 'older', lesser: 'younger' },
    },
  ],
  clues: {
    link: '{a} lives with {b}.',
    notLink: '{a} does not live with {b}.',
    either: '{a} lives with either {b} or {c}.',
    compare: '{greater} is {comparative} than {lesser}.',
    compareGap: '{greater} is exactly {gap} {unit} {comparative} than {lesser}.',
  },
};

function puzzleWith(templates = resolveClueTemplates(theme)): Puzzle {
  return {
    seed: 1,
    clueTemplates: templates,
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    accent: theme.accent,
    size: SIZES[0],
    categories: theme.categories,
    solution: [
      [0, 1, 2],
      [0, 2, 1],
      [2, 1, 0],
    ],
    clues: [],
  };
}

const link: Clue = {
  kind: 'link',
  positive: true,
  a: { category: 0, item: 0 },
  b: { category: 1, item: 1 },
};
const notLink: Clue = { ...link, positive: false } as Clue;
const either: Clue = {
  kind: 'either',
  a: { category: 0, item: 0 },
  options: [
    { category: 1, item: 0 },
    { category: 1, item: 1 },
  ],
};
const compare: Clue = {
  kind: 'compare',
  order: 2,
  greater: { category: 0, item: 1 },
  lesser: { category: 1, item: 0 },
};

describe('resolveClueTemplates', () => {
  it('falls back to the defaults for anything a theme leaves out', () => {
    expect(resolveClueTemplates({ ...theme, clues: undefined })).toEqual(DEFAULT_CLUE_TEMPLATES);
    expect(resolveClueTemplates({ ...theme, clues: { link: '{a} + {b}!' } })).toEqual({
      ...DEFAULT_CLUE_TEMPLATES,
      link: '{a} + {b}!',
    });
  });
});

describe('describeClue', () => {
  const puzzle = puzzleWith();

  it("writes each kind of clue in the theme's own words", () => {
    expect(describeClue(link, puzzle)).toBe('Ann lives with the Dog owner.');
    expect(describeClue(notLink, puzzle)).toBe('Ann does not live with the Dog owner.');
    expect(describeClue(either, puzzle)).toBe(
      'Ann lives with either the Cat owner or the Dog owner.',
    );
    expect(describeClue(compare, puzzle)).toBe('Bo is older than the Cat owner.');
    expect(describeClue({ ...compare, gap: 4 } as Clue, puzzle)).toBe(
      'Bo is exactly 4 years older than the Cat owner.',
    );
  });

  it('says "1 year", not "1 years"', () => {
    expect(describeClue({ ...compare, gap: 1 } as Clue, puzzle)).toContain('1 year older');
  });

  it('uses the neutral wording when a puzzle carries no templates', () => {
    const older = { ...puzzleWith(), clueTemplates: undefined } as unknown as Puzzle;
    expect(describeClue(link, older)).toBe('Ann is paired with the Dog owner.');
    expect(describeClue(compare, older)).toBe('The age for Bo is older than for the Cat owner.');
  });

  it('capitalises whatever lands first, however the template starts', () => {
    const shouty = puzzleWith({ ...DEFAULT_CLUE_TEMPLATES, link: 'the pair {a} and {b} match.' });
    expect(describeClue(link, shouty)).toBe('The pair Ann and the Dog owner match.');
  });

  it('leaves no braces behind, even for a slot that has no value', () => {
    const odd = puzzleWith({ ...DEFAULT_CLUE_TEMPLATES, link: '{a} knows {b} {nonsense}.' });
    const text = describeClue(link, odd);
    expect(text).toBe('Ann knows the Dog owner.');
    expect(text).not.toContain('{');
  });

  it('names the attributes a clue points at, and gives it an icon', () => {
    expect(clueAttributes(either)).toHaveLength(3);
    expect(clueIcon(link)).not.toBe(clueIcon(notLink));
  });
});

describe('every theme', () => {
  it('writes clues that read as finished sentences', () => {
    for (const themeUnderTest of THEMES) {
      const puzzle = generatePuzzle({ theme: themeUnderTest, size: SIZES[3], seed: 2468 });
      for (const clue of puzzle.clues) {
        const text = describeClue(clue, puzzle);
        expect(text).not.toContain('{');
        expect(text).not.toContain('}');
        expect(text).not.toContain('undefined');
        expect(text).toMatch(/^[A-Z].*[.!?]$/);
      }
    }
  });
});
