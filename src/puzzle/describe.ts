/** Turns clue objects into the sentences the player reads. */
import type { Attribute, Clue, Puzzle, PuzzleCategory } from './types';

function phrase(categories: PuzzleCategory[], attr: Attribute): string {
  const category = categories[attr.category];
  return category.pattern.replace('{}', category.items[attr.item].label);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function describeClue(clue: Clue, puzzle: Puzzle): string {
  const categories = puzzle.categories;
  switch (clue.kind) {
    case 'link': {
      const a = capitalise(phrase(categories, clue.a));
      const b = phrase(categories, clue.b);
      return clue.positive ? `${a} is paired with ${b}.` : `${a} is not paired with ${b}.`;
    }
    case 'either': {
      const a = capitalise(phrase(categories, clue.a));
      const first = phrase(categories, clue.options[0]);
      const second = phrase(categories, clue.options[1]);
      return `${a} is paired with either ${first} or ${second}.`;
    }
    case 'compare': {
      const ordered = categories[clue.order].ordered;
      const noun = ordered?.noun ?? categories[clue.order].name.toLowerCase();
      const greaterWord = ordered?.greater ?? 'higher';
      const greater = phrase(categories, clue.greater);
      const lesser = phrase(categories, clue.lesser);
      if (clue.gap === undefined) {
        return `The ${noun} for ${greater} is ${greaterWord} than for ${lesser}.`;
      }
      return `The ${noun} for ${greater} is exactly ${clue.gap} ${ordered?.unit ?? 'units'} ${greaterWord} than for ${lesser}.`;
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

/** The pair grid a clue is most useful on, or null when it spans one category. */
export function cluePrimaryPair(clue: Clue): [number, number] | null {
  const categories = clueAttributes(clue).map((attr) => attr.category);
  for (const first of categories) {
    for (const second of categories) {
      if (first < second) return [first, second];
    }
  }
  return null;
}
