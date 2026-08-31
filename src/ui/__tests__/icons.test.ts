import { markIcon } from '../../components/Mark';
import { iconName, THEMES } from '../../data/themes';
import { ICON_BOX, ICONS } from '../icons.generated';

/**
 * The drawings and the data are kept in two places — SVG files on disk, path
 * data in a generated module — so the thing worth testing is that they still
 * agree with the themes. An item with no drawing behind it would show up as a
 * blank square in the middle of a card, and nothing else would complain.
 *
 * A drawing is named after an item's **id**, not its label, which is what lets
 * the label be rewritten or translated without the picture going missing.
 */
describe('the icon set', () => {
  const named = (name: string) => `${name}: ${ICONS[name] ? 'drawn' : 'missing'}`;
  const drawn = (name: string) => `${name}: drawn`;

  it('has a drawing for every theme', () => {
    for (const theme of THEMES) {
      expect(named(theme.icon)).toBe(drawn(theme.icon));
    }
  });

  it('has a drawing for every item in every category', () => {
    for (const theme of THEMES) {
      for (const category of theme.categories) {
        for (const item of category.items) {
          expect(item.icon).toBe(iconName(theme.id, category.id, item.id));
          expect(named(item.icon)).toBe(drawn(item.icon));
        }
      }
    }
  });

  it('gives each entry a name of its own', () => {
    const names = THEMES.flatMap((theme) =>
      theme.categories.flatMap((category) => category.items.map((item) => item.icon)),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it('draws no two items the same', () => {
    // A shared path means two items have the same silhouette, which on a grid
    // of fourteen suspects is no better than having no icon at all.
    const byPath = new Map<string, string[]>();
    for (const theme of THEMES) {
      for (const category of theme.categories) {
        for (const item of category.items) {
          const path = ICONS[item.icon] ?? item.icon;
          byPath.set(path, [...(byPath.get(path) ?? []), item.icon]);
        }
      }
    }
    const shared = [...byPath.values()].filter((names) => names.length > 1);
    expect(shared).toEqual([]);
  });

  it('draws everything in the same box, and nothing empty', () => {
    expect(ICON_BOX).toBe(100);
    for (const [name, path] of Object.entries(ICONS)) {
      expect(`${name}: ${path.startsWith('M') ? 'a path' : path}`).toBe(`${name}: a path`);
      // A move, two segments and a close: the least a closed shape can be, and
      // what the back arrow's triangle actually is.
      const commands = path.match(/[MLACZ]/g) ?? [];
      expect(`${name}: ${commands.length} commands`).toBe(
        `${name}: ${Math.max(commands.length, 4)} commands`,
      );
      expect(path.endsWith('Z')).toBe(true);
    }
  });

  it('covers the icons the interface itself asks for', () => {
    for (const name of ['ui/icon-clue', 'ui/icon-chart', 'ui/icon-back']) {
      expect(named(name)).toBe(drawn(name));
    }
  });

  /**
   * Nothing on disk that nothing asks for.
   *
   * The other way round from the checks above, and it catches what they cannot:
   * rename an item and the generator draws it afresh under its new name, while
   * the file it had before sits in `assets/icons` for ever, shipping in the
   * bundle and turning up in the contact sheet as somebody who no longer exists.
   */
  it('draws nothing the app has no use for', () => {
    const claimed = new Set<string>(['ui/icon-clue', 'ui/icon-chart', 'ui/icon-back']);
    for (const kind of ['yes', 'no'] as const) {
      for (const weight of ['hand', 'auto'] as const) claimed.add(markIcon(kind, weight));
    }
    for (const theme of THEMES) {
      claimed.add(theme.icon);
      for (const category of theme.categories) {
        for (const item of category.items) claimed.add(item.icon);
      }
    }
    const orphans = Object.keys(ICONS).filter((name) => !claimed.has(name));
    expect(orphans).toEqual([]);
  });

  it('covers all four board marks', () => {
    for (const kind of ['yes', 'no'] as const) {
      for (const weight of ['hand', 'auto'] as const) {
        const name = markIcon(kind, weight);
        expect(named(name)).toBe(drawn(name));
      }
    }
  });
});
