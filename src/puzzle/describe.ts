/**
 * Turns clue objects into the sentences the player reads.
 *
 * The wording lives with the themes: each supplies whichever templates it wants
 * to phrase in its own voice, and anything it leaves out falls back to the
 * neutral defaults here. The templates are resolved when a puzzle is generated
 * and stored on it, so a saved game keeps the wording it was played with.
 */
import type { Attribute, Clue, ClueTemplates, Puzzle, PuzzleCategory, ThemeDef } from './types';

export const DEFAULT_CLUE_TEMPLATES: ClueTemplates = {
  link: '{a} is paired with {b}.',
  notLink: '{a} is not paired with {b}.',
  either: '{a} is paired with either {b} or {c}.',
  compare: 'The {noun} for {greater} is {comparative} than for {lesser}.',
  compareGap:
    'The {noun} for {greater} is exactly {gap} {unit} {comparative} than for {lesser}.',
};

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

export function describeClue(clue: Clue, puzzle: Puzzle): string {
  const categories = puzzle.categories;
  // Older saved games predate per-theme wording.
  const templates = puzzle.clueTemplates ?? DEFAULT_CLUE_TEMPLATES;

  switch (clue.kind) {
    case 'link':
      return fill(templates[clue.positive ? 'link' : 'notLink'], {
        a: phrase(categories, clue.a),
        b: phrase(categories, clue.b),
      });

    case 'either':
      return fill(templates.either, {
        a: phrase(categories, clue.a),
        b: phrase(categories, clue.options[0]),
        c: phrase(categories, clue.options[1]),
      });

    case 'compare': {
      const ordered = categories[clue.order].ordered;
      const unit = ordered?.unit ?? 'units';
      const values = {
        greater: phrase(categories, clue.greater),
        lesser: phrase(categories, clue.lesser),
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
    case 'either':
      return [clue.a, clue.options[0], clue.options[1]];
    case 'compare':
      return [clue.greater, clue.lesser];
  }
}
