/**
 * Turns clue objects into the sentences the player reads.
 *
 * The wording lives with the themes: each supplies whichever templates it wants
 * to phrase in its own voice, and anything it leaves out falls back to the
 * neutral defaults here. The templates are resolved when a puzzle is generated
 * and stored on it, so a saved game keeps the wording it was played with.
 */
import type {
  Attribute,
  Clue,
  ClueTemplates,
  Puzzle,
  PuzzleCategory,
  ThemeDef,
  TraitGroup,
} from './types';

export const DEFAULT_CLUE_TEMPLATES: ClueTemplates = {
  link: '{a} is paired with {b}.',
  notLink: '{a} is not paired with {b}.',
  groupNot: 'No {a} is paired with {b}.',
  either: '{a} is paired with either {b} or {c}.',
  compare: 'The {noun} for {greater} is {comparative} than for {lesser}.',
  compareGap: 'The {noun} for {greater} is exactly {gap} {unit} {comparative} than for {lesser}.',
};

/**
 * How often a clue describes something instead of naming it: one slot in
 * `DESCRIBE_ONE_IN`. Every clue would be wordy and every card would have to be
 * read; none, and the descriptions would be decoration.
 */
const DESCRIBE_ONE_IN = 3;

export function resolveClueTemplates(theme: ThemeDef): ClueTemplates {
  return { ...DEFAULT_CLUE_TEMPLATES, ...theme.clues };
}

/** Fills `{name}` slots; a slot with no value is left out rather than printed. */
function fill(template: string, values: Record<string, string | number | undefined>): string {
  const sentence = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? '' : String(value);
  });
  // A slot that had no value leaves a gap behind: tidy the spacing, including
  // any space it left sitting in front of the punctuation.
  const tidy = sentence
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
  // Templates start with a slot as often as not, so capitalise the result.
  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}

function phrase(categories: PuzzleCategory[], attr: Attribute): string {
  const category = categories[attr.category];
  return category.pattern.replace('{}', category.items[attr.item].label);
}

/**
 * A trait as words, without an article: "astronaut with red hair", "payload
 * made of glass". What goes in front of it is the clue's business — "the" when
 * it picks out one thing, "no" when it rules a group out.
 */
export function traitPhrase(category: PuzzleCategory, trait: string, value: string): string | null {
  const def = category.traits.find((candidate) => candidate.id === trait);
  if (!def) return null;
  return def.pattern.replace('{noun}', category.noun).replace('{}', value);
}

/** Which items of a category carry a trait value. */
export function itemsWithTrait(category: PuzzleCategory, trait: string, value: string): number[] {
  const found: number[] = [];
  category.items.forEach((item, index) => {
    if (item.traits[trait] === value) found.push(index);
  });
  return found;
}

/**
 * The descriptions that pick out exactly this item and nothing else in its
 * category — the ones a clue can use in place of its name and still be fair.
 */
export function uniqueTraitsFor(category: PuzzleCategory, item: number): TraitDescription[] {
  const found: TraitDescription[] = [];
  for (const trait of category.traits) {
    const value = category.items[item].traits[trait.id];
    if (value === undefined) continue;
    if (itemsWithTrait(category, trait.id, value).length === 1) {
      found.push({ trait: trait.id, value });
    }
  }
  return found;
}

export interface TraitDescription {
  trait: string;
  value: string;
}

/** A small stable hash, so a clue is worded the same way every time it is read. */
function hashOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * A description dropped into the sentence where the name would have gone.
 *
 * A clue about a weapon is really about the hero holding it, so the category's
 * own frame does the work — "the wielder of the ..." — and the articles in it
 * are rewritten for what the clue is doing: `the` for the one thing it can only
 * mean, `no` for a group being ruled out, `a` for one of several.
 */
type Voice = 'the' | 'no' | 'a';

function frame(category: PuzzleCategory, described: string, voice: Voice): string {
  let sentence = category.describes;
  if (voice !== 'the') {
    let first = true;
    sentence = sentence.replace(/\bthe\b/g, () => {
      const word = first && voice === 'no' ? 'no' : 'a';
      first = false;
      return word;
    });
  }
  return tidyArticles(sentence.replace('{}', described));
}

/** "a astronaut" is nobody's idea of a clue. */
function tidyArticles(sentence: string): string {
  return sentence.replace(/\ba (?=[aeiou])/g, 'an ');
}

/**
 * One side of a clue: the item's name, or a description that fits only it.
 *
 * Which one is decided by a hash of the puzzle and the slot, so a clue always
 * reads the same way, and only descriptions unique to the cast are ever used —
 * "the diver with green eyes" has to mean one diver.
 */
function name(puzzle: Puzzle, attr: Attribute, slot: string): string {
  const category = puzzle.categories[attr.category];
  const options = uniqueTraitsFor(category, attr.item);
  if (options.length === 0) return phrase(puzzle.categories, attr);

  const roll = hashOf(`${puzzle.seed}:${slot}:${attr.category}.${attr.item}`);
  if (roll % DESCRIBE_ONE_IN !== 0) return phrase(puzzle.categories, attr);

  const chosen = options[roll % options.length];
  const described = traitPhrase(category, chosen.trait, chosen.value);
  return described === null ? phrase(puzzle.categories, attr) : frame(category, described, 'the');
}

export function describeClue(clue: Clue, puzzle: Puzzle): string {
  const categories = puzzle.categories;
  // Older saved games predate per-theme wording.
  const templates = puzzle.clueTemplates ?? DEFAULT_CLUE_TEMPLATES;

  switch (clue.kind) {
    case 'link':
      return fill(templates[clue.positive ? 'link' : 'notLink'], {
        a: name(puzzle, clue.a, 'a'),
        b: name(puzzle, clue.b, 'b'),
      });

    case 'groupNot': {
      const category = categories[clue.group.category];
      const described = traitPhrase(category, clue.group.trait, clue.group.value);
      // The frame in its "no" voice, with the leading word left off: the
      // template starts the sentence with "No".
      const group =
        described === null ? category.name.toLowerCase() : frame(category, described, 'no');
      return fill(templates.groupNot ?? DEFAULT_CLUE_TEMPLATES.groupNot, {
        a: group.replace(/^no /, ''),
        b: name(puzzle, clue.b, 'b'),
      });
    }

    case 'either': {
      // Two options that are exactly the cast's holders of one trait value can
      // be put as one description — "an object made of metal" — which is the
      // same statement with less to read.
      const options = clue.options;
      const category = categories[options[0].category];
      const shared = category.traits.find((trait) => {
        const value = category.items[options[0].item].traits[trait.id];
        if (value === undefined || category.items[options[1].item].traits[trait.id] !== value) {
          return false;
        }
        return itemsWithTrait(category, trait.id, value).length === options.length;
      });
      if (shared) {
        const value = category.items[options[0].item].traits[shared.id];
        const described = traitPhrase(category, shared.id, value);
        if (described) {
          // Two options that share a description are one statement: "paired
          // with a payload made of glass" says the same as naming both.
          return fill(templates.link, {
            a: name(puzzle, clue.a, 'a'),
            b: frame(category, described, 'a'),
          });
        }
      }
      return fill(templates.either, {
        a: name(puzzle, clue.a, 'a'),
        b: phrase(categories, options[0]),
        c: phrase(categories, options[1]),
      });
    }

    case 'compare': {
      const ordered = categories[clue.order].ordered;
      const unit = ordered?.unit ?? 'units';
      const values = {
        greater: name(puzzle, clue.greater, 'greater'),
        lesser: name(puzzle, clue.lesser, 'lesser'),
        noun: ordered?.noun ?? categories[clue.order].name.toLowerCase(),
        comparative: ordered?.greater ?? 'higher',
        gap: clue.gap,
        // "1 years" reads badly; the themes name their units in the plural.
        unit: clue.gap === 1 ? unit.replace(/s$/, '') : unit,
      };
      return fill(clue.gap === undefined ? templates.compare : templates.compareGap, values);
    }
  }
}

export function clueIcon(clue: Clue): string {
  switch (clue.kind) {
    case 'link':
      return clue.positive ? '✓' : '✕';
    case 'groupNot':
      return '⊘';
    case 'either':
      return '?';
    case 'compare':
      return '⋚';
  }
}

/** Every attribute a clue talks about — used to highlight the grid. */
export function clueAttributes(clue: Clue): Attribute[] {
  switch (clue.kind) {
    case 'link':
      return [clue.a, clue.b];
    case 'groupNot':
      return [clue.b, ...groupAttributes(clue.group)];
    case 'either':
      return [clue.a, clue.options[0], clue.options[1]];
    case 'compare':
      return [clue.greater, clue.lesser];
  }
}

/** The members of a described group, as attributes. */
export function groupAttributes(group: TraitGroup): Attribute[] {
  return group.items.map((item) => ({ category: group.category, item }));
}
