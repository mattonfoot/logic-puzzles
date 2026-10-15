#!/usr/bin/env node
/**
 * Reads the language files and writes the module the app imports.
 *
 * A locale is a folder of YAML files under `locales/`, each holding part of one
 * tree: the interface, the lessons, the achievements, and a file per theme. They
 * are merged into that tree here, and a line two files both claim stops the
 * build rather than one quietly winning.
 *
 * Metro cannot import YAML, and a parser in the bundle would be a parser
 * shipped to every phone to read files that never change at runtime. So the
 * YAML is the source and `src/i18n/strings.generated.ts` is the build of it —
 * the same arrangement the icons use, and committed for the same reason: what
 * ships is checked in, and a test fails if the two drift apart.
 *
 *   npm run locale
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCALE = 'en-GB';
export const LOCALE_DIR = join(ROOT, 'locales', LOCALE);
export const OUT_FILE = join(ROOT, 'src', 'i18n', 'strings.generated.ts');

/**
 * Every file of the locale: the interface first, then the rest of the top
 * folder, then the themes, each group in name order. The order only decides the
 * order of the generated module; what any line says does not depend on it.
 */
export async function localeFiles(dir = LOCALE_DIR) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
  const rank = (file) => {
    const where = relative(dir, file);
    return [where === 'ui.yaml' ? 0 : where.includes('/') ? 2 : 1, where];
  };
  return files.sort((a, b) => {
    const [ra, wa] = rank(a);
    const [rb, wb] = rank(b);
    return ra - rb || wa.localeCompare(wb);
  });
}

/** Folds one file's part of the tree into the whole, refusing a line claimed twice. */
function merge(into, from, file, path = []) {
  for (const [key, value] of Object.entries(from)) {
    const here = [...path, key];
    const isTree = (node) => node && typeof node === 'object' && !Array.isArray(node);
    if (!(key in into)) {
      into[key] = isTree(value) ? merge({}, value, file, here) : value;
    } else if (isTree(into[key]) && isTree(value)) {
      merge(into[key], value, file, here);
    } else {
      throw new Error(`${here.join('.')} is written twice; the second is in ${file}`);
    }
  }
  return into;
}

/** The whole locale as one tree. */
export async function readLocale(dir = LOCALE_DIR) {
  const tree = {};
  for (const file of await localeFiles(dir)) {
    const part = parse(await readFile(file, 'utf8'));
    if (part) merge(tree, part, relative(ROOT, file));
  }
  return tree;
}

/**
 * The parts of the file the app reads as data rather than line by line: the
 * themes and the briefings, which `src/data` walks for itself and never hands
 * to `t`. They are most of the file. Spelled out as literal types and keys
 * they would be most of the generated types too — thousands of keys nothing
 * can use — so they are typed loosely and left out of `StringKey`.
 */
const DATA = { themes: 'THEME_WORDS', briefings: 'BRIEFING_WORDS' };

/** Every leaf path of the tree, dotted, so the keys can be typed. */
function leafKeys(node, prefix = '') {
  if (typeof node === 'string') return [prefix];
  if (Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

/** Marks a node to be written as a reference to the named declaration. */
const REF = Symbol('ref');

/** TypeScript source for a value, indented to sit inside the object. */
function render(node, depth) {
  const pad = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);
  if (typeof node === 'string') return JSON.stringify(node);
  if (node[REF]) return node[REF];
  if (Array.isArray(node)) {
    if (node.length === 0) return '[]';
    return `[\n${node.map((item) => `${inner}${render(item, depth + 1)},`).join('\n')}\n${pad}]`;
  }
  const entries = Object.entries(node).map(
    ([key, value]) => `${inner}${JSON.stringify(key)}: ${render(value, depth + 1)},`,
  );
  return `{\n${entries.join('\n')}\n${pad}}`;
}

/**
 * The module, as the repository's own formatter would have written it.
 *
 * `render` above emits valid TypeScript and not much more: JSON quoting on
 * every key, double quotes on every string, one line per entry however short.
 * Prettier disagrees with all three, so a plain `npm run locale` used to leave
 * the checkout failing `npm run format:check` until somebody noticed and ran
 * the formatter by hand. Handing the source to Prettier here, under the
 * project's own config, settles it by construction: whatever the rules are,
 * the generated file is already written to them.
 */
export async function buildLocale() {
  const tree = await readLocale();
  const keys = leafKeys(tree)
    .filter((key) => !(key.split('.')[0] in DATA))
    .sort();
  // The data parts are declared on their own and put back in their places.
  const lines = { ...tree };
  for (const [part, name] of Object.entries(DATA)) lines[part] = { [REF]: name };
  const data = Object.entries(DATA)
    .map(([part, name]) => `const ${name} = ${render(tree[part], 0)} as unknown as Words;\n`)
    .join('\n');

  const built = `// Generated by scripts/locale.mjs from locales/${LOCALE}/ — do not edit.
// Change the wording there and run \`npm run locale\`.

export const LOCALE = '${LOCALE}';

/** Any part of the file, typed no closer than its shape. */
export type Words = string | readonly Words[] | { readonly [key: string]: Words };

${data}
export const STRINGS = ${render(lines, 0)} as const;

/** Every plain-string key in the language file, dotted. */
export type StringKey =
${keys.map((key) => `  | ${JSON.stringify(key)}`).join('\n')};
`;
  const config = await resolveConfig(OUT_FILE);
  return format(built, { ...config, filepath: OUT_FILE });
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('locale.mjs');
if (invokedDirectly) {
  const built = await buildLocale();
  await writeFile(OUT_FILE, built, 'utf8');
  const count = built.split('\n').filter((line) => line.startsWith('  | ')).length;
  console.log(`${count} strings → src/i18n/strings.generated.ts`);
}
