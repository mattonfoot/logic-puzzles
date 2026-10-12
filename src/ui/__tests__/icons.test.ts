import { markIcon } from '../../components/Mark';
import { ACHIEVEMENT_ICONS } from '../../game/achievements';
import { iconName, THEMES } from '../../data/themes';
import { ICON_BOX, ICONS, type IconShape } from '../icons.generated';
import { detailName, layersOf } from '../Icon';

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
  /** A whole drawing as one line, for comparing one against another. */
  const outline = (shapes: IconShape[]) =>
    shapes
      .map((shape) => `${shape.d}|${shape.stroke ?? 0}|${shape.evenOdd ? 'odd' : ''}`)
      .join('~');

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
          const shapes = ICONS[item.icon];
          const path = shapes ? outline(shapes) : item.icon;
          byPath.set(path, [...(byPath.get(path) ?? []), item.icon]);
        }
      }
    }
    const shared = [...byPath.values()].filter((names) => names.length > 1);
    expect(shared).toEqual([]);
  });

  it('draws everything in the same box, and nothing empty', () => {
    expect(ICON_BOX).toBe(100);
    for (const [name, shapes] of Object.entries(ICONS)) {
      expect(`${name}: ${shapes.length} shapes`).not.toBe(`${name}: 0 shapes`);
      for (const shape of shapes) {
        const where = `${name} (${shape.d.slice(0, 12)}…)`;
        expect(`${where}: ${shape.d.startsWith('M') ? 'a path' : shape.d}`).toBe(
          `${where}: a path`,
        );
        if (shape.stroke) {
          // A line is open by nature and can be as short as two points — the
          // straight one laid over the knot in a diver's drawing is exactly
          // that — so neither the closing Z nor the four commands below apply.
          expect(shape.stroke).toBeGreaterThan(0);
          continue;
        }
        // A move, two segments and a close: the least a closed shape can be,
        // and what the back arrow's triangle actually is.
        const commands = shape.d.match(/[MLACZ]/g) ?? [];
        expect(`${where}: ${commands.length} commands`).toBe(
          `${where}: ${Math.max(commands.length, 4)} commands`,
        );
        expect(shape.d.endsWith('Z')).toBe(true);
      }
    }
  });

  it('covers the icons the interface itself asks for', () => {
    for (const name of ['ui/icon-clue', 'ui/icon-chart', 'ui/icon-back']) {
      expect(named(name)).toBe(drawn(name));
    }
    // And every drawing an achievement card can ask for: a card with no icon is
    // a card with a hole in it, and nothing else would say so.
    for (const name of ACHIEVEMENT_ICONS) expect(ICONS[name]).toBeTruthy();
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
    const claimed = new Set<string>([
      'ui/icon-clue',
      'ui/icon-chart',
      'ui/icon-back',
      'ui/icon-zoom-out',
      ...ACHIEVEMENT_ICONS,
    ]);
    // An item may carry a second, fuller drawing for the card; it is claimed by
    // the same item as the one the board uses.
    for (const theme of THEMES) {
      for (const category of theme.categories) {
        for (const item of category.items) claimed.add(detailName(item.icon));
      }
    }
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

  /**
   * Nothing drawn outside the box it is drawn in.
   *
   * The viewBox clips, silently and only at the edges, so a crest or a topknot
   * a few units above the crown loses its tip in the app while looking perfect
   * in the file it was authored in. Two of the twelve hairs shipped that way.
   * `A` carries radii and flags among its numbers, so only the pairs that are
   * really points are checked — which is every command's last two.
   */
  it('keeps every drawing inside the box', () => {
    const outside: string[] = [];
    for (const [name, shapes] of Object.entries(ICONS)) {
      for (const shape of shapes) {
        // A line is drawn *along* its path, so it reaches half its width past
        // it on every side — a stroke that ends on the edge of the box loses
        // its outer half, and the file it was authored in never says so.
        const reach = (shape.stroke ?? 0) / 2;
        for (const step of shape.d.replace(/Z/g, '').split(/(?=[MLAC])/)) {
          const numbers = step
            .replace(/^[MLAC]/, '')
            .trim()
            .split(/[\s,]+/)
            .map(Number);
          const [x, y] = numbers.slice(-2);
          // A hair may fall past the bottom of the box into the shoulders; it
          // is the crown, the back and the face that get quietly cut.
          if (x - reach < 0 || x + reach > ICON_BOX || y - reach < 0) {
            outside.push(`${name} at ${x} ${y}`);
          }
        }
      }
    }
    expect(outside).toEqual([]);
  });

  /**
   * A fuller drawing is an alternative to one the board uses, never a drawing
   * in its own right. One with no plain drawing behind it is an item that was
   * renamed and left half its artwork behind, which nothing else would catch —
   * the card would quietly fall back and the board would show nothing.
   */
  it('gives every fuller drawing a plain one to fall back to', () => {
    const detailed = Object.keys(ICONS).filter((name) => name.endsWith('@detail'));
    expect(detailed.length).toBeGreaterThan(0);
    const stranded = detailed.filter((name) => !ICONS[name.replace(/@detail$/, '')]);
    expect(stranded).toEqual([]);
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

/**
 * A drawing is painted in order, and a cut takes a piece back out of what is
 * under it — so a cut closes the run before it, and whatever follows is painted
 * on top of the result rather than being cut as well.
 */
describe('splitting a drawing into what is painted and what is cut', () => {
  const paint = (d: string): IconShape => ({ d });
  const cut = (d: string): IconShape => ({ d, cut: true });

  it('leaves a plain drawing as one layer with nothing cut', () => {
    expect(layersOf([paint('A'), paint('B')])).toEqual([
      { paint: [paint('A'), paint('B')], cut: [] },
    ]);
  });

  it('closes a layer at its cuts, and paints what follows on top', () => {
    expect(layersOf([paint('A'), cut('hole'), paint('B')])).toEqual([
      { paint: [paint('A')], cut: [cut('hole')] },
      { paint: [paint('B')], cut: [] },
    ]);
  });

  it('keeps every shape of every drawing that ships', () => {
    for (const [name, shapes] of Object.entries(ICONS)) {
      const layers = layersOf(shapes);
      const kept = layers.flatMap((layer) => [...layer.paint, ...layer.cut]).length;
      expect(`${name}: ${kept} of ${shapes.length}`).toBe(
        `${name}: ${shapes.length} of ${shapes.length}`,
      );
      // Nothing is cut out of nothing: a cut needs shapes under it to take from.
      for (const layer of layers) {
        if (layer.cut.length > 0) expect(layer.paint.length).toBeGreaterThan(0);
      }
    }
  });
});
