import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import {
  DEFAULT_CLUE_TEMPLATES,
  clueAttributes,
  clueIcon,
  describeClue,
  itemsWithTrait,
  resolveClueTemplates,
  traitPhrase,
  uniqueTraitsFor,
} from '../describe';
import { generatePuzzle } from '../generator';
import type { Clue, ItemDef, Puzzle, ThemeDef } from '../types';

/** A bare item: these tests are about the logic, not the words. */
const item = (label: string, value?: number): ItemDef => ({
  label,
  value,
  icon: '·',
  blurb: 'A thing that exists.',
  traits: {},
});

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
      describes: 'the {}',
      noun: 'thing',
      traits: [],
      items: [item('Ann'), item('Bo'), item('Cy')],
    },
    {
      id: 'pet',
      name: 'Pet',
      pattern: 'the {} owner',
      describes: 'the {}',
      noun: 'thing',
      traits: [],
      items: [item('Cat'), item('Dog'), item('Newt')],
    },
    {
      id: 'age',
      name: 'Age',
      pattern: 'the {} year old',
      describes: 'the {}',
      noun: 'thing',
      traits: [],
      items: [item('7', 7), item('9', 9), item('11', 11)],
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

/**
 * The same three people and pets, with something to say about them: two small
 * pets and one large one, so a description covers a group in one direction and
 * exactly one thing in the other.
 */
const describedTheme: ThemeDef = {
  ...theme,
  categories: [
    {
      ...theme.categories[0],
      noun: 'person',
      traits: [{ id: 'hair', label: 'Hair', pattern: '{noun} with {} hair' }],
      items: [
        { ...item('Ann'), traits: { hair: 'red' } },
        { ...item('Bo'), traits: { hair: 'red' } },
        { ...item('Cy'), traits: { hair: 'grey' } },
      ],
    },
    {
      ...theme.categories[1],
      describes: 'the owner of the {}',
      noun: 'pet',
      traits: [{ id: 'size', label: 'Size', pattern: '{} {noun}' }],
      items: [
        { ...item('Cat'), traits: { size: 'small' } },
        { ...item('Dog'), traits: { size: 'small' } },
        { ...item('Newt'), traits: { size: 'tiny' } },
      ],
    },
    theme.categories[2],
  ],
  clues: { ...theme.clues, groupNot: 'No {a} lives with {b}.' },
};

const described = (): Puzzle => ({
  ...puzzleWith(resolveClueTemplates(describedTheme)),
  categories: describedTheme.categories,
});

describe('describing something instead of naming it', () => {
  const puzzle = described();
  const people = puzzle.categories[0];
  const pets = puzzle.categories[1];

  it('reads a trait as words, without deciding what goes in front of it', () => {
    expect(traitPhrase(people, 'hair', 'grey')).toBe('person with grey hair');
    expect(traitPhrase(pets, 'size', 'small')).toBe('small pet');
    expect(traitPhrase(pets, 'nose', 'wet')).toBeNull();
  });

  it('knows which descriptions pick out one thing and which cover a group', () => {
    expect(itemsWithTrait(people, 'hair', 'red')).toEqual([0, 1]);
    // Ann and Bo share their hair, so neither can be described by it.
    expect(uniqueTraitsFor(people, 0)).toEqual([]);
    expect(uniqueTraitsFor(people, 2)).toEqual([{ trait: 'hair', value: 'grey' }]);
    expect(uniqueTraitsFor(pets, 2)).toEqual([{ trait: 'size', value: 'tiny' }]);
  });

  it('puts the description where the name would have gone', () => {
    // The clue is about the person who owns the pet, so the category's frame
    // does the work: "the owner of ...", not "the pet ...".
    const clue: Clue = {
      kind: 'link',
      positive: true,
      a: { category: 0, item: 2 },
      b: { category: 1, item: 2 },
    };
    const text = describeClue(clue, puzzle);
    expect(text).toMatch(
      /^(Cy|The person with grey hair) lives with (the Newt owner|the owner of the tiny pet)\.$/,
    );
    // Whatever it chose, it chose the same thing the second time.
    expect(describeClue(clue, puzzle)).toBe(text);
  });

  it('rules out a whole group in one sentence', () => {
    const clue: Clue = {
      kind: 'groupNot',
      group: { category: 1, trait: 'size', value: 'small', items: [0, 1] },
      b: { category: 0, item: 2 },
    };
    expect(describeClue(clue, puzzle)).toBe('No owner of a small pet lives with Cy.');
    expect(clueIcon(clue)).toBe('⊘');
    expect(clueAttributes(clue)).toEqual([
      { category: 0, item: 2 },
      { category: 1, item: 0 },
      { category: 1, item: 1 },
    ]);
  });

  it('puts two options that share a description as one', () => {
    // Cat and Dog are exactly the small pets, so "a small pet" says it all.
    const clue: Clue = {
      kind: 'either',
      a: { category: 0, item: 2 },
      options: [
        { category: 1, item: 0 },
        { category: 1, item: 1 },
      ],
    };
    expect(describeClue(clue, puzzle)).toBe('Cy lives with an owner of a small pet.');
  });

  it('keeps naming both when the two options are not a group of their own', () => {
    const clue: Clue = {
      kind: 'either',
      a: { category: 0, item: 2 },
      options: [
        { category: 1, item: 0 },
        { category: 1, item: 2 },
      ],
    };
    expect(describeClue(clue, puzzle)).toBe(
      'Cy lives with either the Cat owner or the Newt owner.',
    );
  });

  it('describes a fair share of the clues a real puzzle throws up', () => {
    // A side that was described is a side whose name is missing from the
    // sentence, which is the only reading that does not depend on the wording.
    let describedSides = 0;
    let sides = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const made = generatePuzzle({ theme: THEMES, size: SIZES[1], seed: seed * 37 });
      for (const clue of made.clues) {
        if (clue.kind !== 'link') continue;
        const text = describeClue(clue, made);
        for (const attr of [clue.a, clue.b]) {
          sides++;
          if (!text.includes(made.categories[attr.category].items[attr.item].label)) {
            describedSides++;
          }
        }
      }
    }
    // Enough to be worth reading the cards for, nowhere near all of them.
    expect(describedSides).toBeGreaterThan(sides * 0.15);
    expect(describedSides).toBeLessThan(sides * 0.5);
  });
});
