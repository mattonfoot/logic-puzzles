import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fill, LOCALE, plural, STRINGS, t } from '..';

const LOCALE_FILE = join(__dirname, '..', '..', '..', 'locales', 'en-GB.yaml');

/** Every line of the language file, wherever it sits in the tree. */
function everyLine(node: unknown, path = ''): { path: string; text: string }[] {
  if (typeof node === 'string') return [{ path, text: node }];
  if (Array.isArray(node)) return node.flatMap((item, at) => everyLine(item, `${path}[${at}]`));
  return Object.entries(node as object).flatMap(([key, value]) =>
    everyLine(value, path ? `${path}.${key}` : key),
  );
}

describe('the generated strings', () => {
  it('are still the ones written in the language file', () => {
    // The YAML is the source and the module is the build of it, so a wording
    // change without `npm run locale` would ship the old words. A YAML parser
    // cannot be imported here — the package resolves to its ESM build under the
    // React Native preset — so this reads the file as text and holds every
    // string the app would say to appearing in it. That catches the direction
    // that matters: a line edited or removed in the YAML and left stale here.
    const source = readFileSync(LOCALE_FILE, 'utf8');
    // A single quote inside a single-quoted YAML scalar is written twice, which
    // is the file's spelling of the word rather than a different word.
    const written = (text: string) =>
      source.includes(text) || source.includes(text.replace(/'/g, "''"));
    const missing = everyLine(STRINGS)
      .filter(({ text }) => !written(text))
      .map(({ path }) => path);
    expect(missing).toEqual([]);
  });

  it('are the locale they claim to be', () => {
    expect(LOCALE).toBe('en-GB');
    expect(readFileSync(LOCALE_FILE, 'utf8')).toContain('app:');
  });
});

describe('t', () => {
  it('reads a line', () => {
    expect(t('common.back')).toBe('Back');
  });

  it('fills the braces in', () => {
    expect(t('numbers.puzzle', { number: 7 })).toBe('Puzzle 7');
  });

  it('leaves a placeholder nothing was given for alone, rather than blanking it', () => {
    expect(t('numbers.puzzle')).toBe('Puzzle {number}');
  });

  it('hands back the key when there is no line, so a gap is searchable', () => {
    expect(t('nope.not.here' as never)).toBe('nope.not.here');
  });
});

describe('plural', () => {
  it('takes the one form at exactly one', () => {
    expect(plural('stats.clues', 1)).toBe(' · 1 clue');
  });

  it('takes the other form for none and for many', () => {
    expect(plural('stats.clues', 0)).toBe(' · 0 clues');
    expect(plural('stats.clues', 4)).toBe(' · 4 clues');
  });

  it('offers the count without being asked', () => {
    expect(plural('game.status.rewound', 2, { steps: 2 })).toContain('2 moves');
  });
});

describe('fill', () => {
  it('is a no-op with nothing to put in', () => {
    expect(fill('plain')).toBe('plain');
  });
});

describe('the language file', () => {
  it('leaves no line empty', () => {
    const walk = (node: unknown, path: string): string[] => {
      if (typeof node === 'string') return node.trim() === '' ? [path] : [];
      if (Array.isArray(node)) return node.flatMap((item, at) => walk(item, `${path}[${at}]`));
      return Object.entries(node as object).flatMap(([key, value]) =>
        walk(value, path ? `${path}.${key}` : key),
      );
    };
    expect(walk(STRINGS, '')).toEqual([]);
  });
});
