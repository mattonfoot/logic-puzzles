/**
 * Everything the app says, read from the language file.
 *
 * `locales/en-HB.yaml` is the source; `npm run locale` builds it into
 * `strings.generated.ts`, which is what ships. Metro cannot import YAML, and a
 * parser in the bundle would be a parser on every phone reading a file that
 * never changes at runtime — so it is read once, at build time, the same way
 * the icons are.
 *
 * `t` takes a dotted key, and the keys are a generated union, so a key that is
 * not in the language file is a compile error rather than a blank space on a
 * screen. That is the whole guarantee: nothing can quietly go untranslated.
 *
 * There is one locale today. Adding another means another YAML beside this one
 * and a choice of which to build; nothing that calls `t` has to change, which
 * is the point of doing this before there is a second language rather than
 * after.
 */
import { LOCALE, STRINGS, type StringKey } from './strings.generated';

export { LOCALE, STRINGS, type StringKey };

/** What a `{placeholder}` can be filled with. */
export type Vars = Record<string, string | number>;

function lookup(key: string): unknown {
  let node: unknown = STRINGS;
  for (const step of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[step];
  }
  return node;
}

/** Puts the values into a string's `{braces}`. */
export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * One line of the language file.
 *
 * A key that is missing at runtime — which the types are meant to make
 * impossible — comes back as the key itself rather than as nothing, so a
 * mistake shows up on the screen as something to search for instead of a gap.
 */
export function t(key: StringKey, vars?: Vars): string {
  const found = lookup(key);
  if (typeof found !== 'string') return key;
  return fill(found, vars);
}

/**
 * The `.one` / `.other` pair under a key, chosen by the count.
 *
 * English wants two forms and puts the boundary at one; a language that wants
 * more, or wants it elsewhere, changes this function and the shape of those
 * keys together. `count` is offered to the string as `{count}` without being
 * asked for, since a counted line almost always wants to say the number.
 */
export function plural(key: string, count: number, vars?: Vars): string {
  const branch = count === 1 ? `${key}.one` : `${key}.other`;
  const found = lookup(branch);
  if (typeof found !== 'string') return branch;
  return fill(found, { count, ...vars });
}
