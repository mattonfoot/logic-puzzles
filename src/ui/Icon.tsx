import React, { useId } from 'react';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';

import { ICON_BOX, ICONS, type IconShape } from './icons.generated';
import { useTheme } from './ThemeProvider';

interface Props {
  /** Which drawing, e.g. `quest/beast-griffin`. */
  name: string;
  size?: number;
  /** Defaults to the page's ink. */
  color?: string;
  /**
   * Ask for the fuller drawing of this item, where one exists.
   *
   * A set's drawings have to tell fourteen things apart at the size a board
   * heading gets, which is a different job from showing one of them to somebody
   * who has stopped to read about it. Some items are drawn twice for that: a
   * plain shape that survives 24 points, and a fuller one with the detail cut
   * back in. The card asks for the fuller one; everywhere else takes what the
   * board needs. An item drawn only once gives the same drawing either way.
   */
  detail?: boolean;
}

/** The fuller drawing's name: the same item, with `@detail` on the end. */
export const detailName = (name: string) => `${name}@detail`;

/** A run of shapes painted together, and the shapes that cut holes in them. */
interface Layer {
  paint: IconShape[];
  cut: IconShape[];
}

/**
 * A drawing's shapes split into the layers it is painted in.
 *
 * Shapes are painted in order, and a `cut` takes a piece back out of what is
 * under it — so a cut closes the run before it, and whatever follows is painted
 * on top of the result. Nearly every drawing is one layer with nothing cut.
 */
export function layersOf(shapes: IconShape[]): Layer[] {
  const layers: Layer[] = [];
  let layer: Layer = { paint: [], cut: [] };
  for (const shape of shapes) {
    if (shape.cut) {
      layer.cut.push(shape);
      continue;
    }
    if (layer.cut.length > 0) {
      layers.push(layer);
      layer = { paint: [], cut: [] };
    }
    layer.paint.push(shape);
  }
  if (layer.paint.length > 0 || layer.cut.length > 0) layers.push(layer);
  return layers;
}

function Shape({ shape, ink }: { shape: IconShape; ink: string }) {
  return (
    <Path
      d={shape.d}
      fill={shape.stroke ? 'none' : ink}
      fillRule={shape.evenOdd ? 'evenodd' : 'nonzero'}
      stroke={shape.stroke ? ink : undefined}
      strokeWidth={shape.stroke}
      strokeLinecap={shape.cap}
      strokeLinejoin={shape.join}
    />
  );
}

/**
 * One of the app's silhouettes.
 *
 * The artwork is the SVG files in `assets/icons`; `npm run icons` reads them
 * into `icons.generated.ts` as path data, which is what ships. Every shape is
 * drawn in the same box and in a single colour, so an icon takes the colour of
 * whatever it sits in and needs nothing else said about it.
 *
 * A drawing is a list of shapes painted in order rather than one outline. Most
 * are one filled shape and nothing more; some are several, some are drawn as a
 * line of a given width rather than filled, and some cut holes back out of what
 * is under them. Which it is belongs to the artwork, so it is read off the file
 * rather than decided here — all this does is hand each shape the one colour
 * they all share.
 *
 * A name with no drawing behind it renders nothing rather than a broken box —
 * a game saved before an item was renamed still opens.
 */
export function Icon({ name, size = 24, color, detail = false }: Props) {
  const palette = useTheme();
  // Masks are named in the document, so two icons on one screen would collide
  // over a shared name. This is the one thing about an icon that cannot come
  // from the artwork.
  const unique = useId();
  const shapes = (detail ? ICONS[detailName(name)] : undefined) ?? ICONS[name];
  if (!shapes) return null;
  const ink = color ?? palette.ink;
  const layers = layersOf(shapes);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}>
      <Defs>
        {layers.map((layer, index) =>
          layer.cut.length === 0 ? null : (
            <Mask key={index} id={`${unique}-${index}`}>
              {/* White shows, black hides: the cuts are the black. */}
              <Rect width={ICON_BOX} height={ICON_BOX} fill="#fff" />
              {layer.cut.map((shape, at) => (
                <Path
                  key={at}
                  d={shape.d}
                  fill="#000"
                  fillRule={shape.evenOdd ? 'evenodd' : 'nonzero'}
                />
              ))}
            </Mask>
          ),
        )}
      </Defs>
      {layers.map((layer, index) =>
        layer.cut.length === 0 ? (
          // The shapes of one drawing are a fixed list in a fixed order, so
          // their place in it is the only name they have or need.
          layer.paint.map((shape, at) => <Shape key={`${index}-${at}`} shape={shape} ink={ink} />)
        ) : (
          <G key={index} mask={`url(#${unique}-${index})`}>
            {layer.paint.map((shape, at) => (
              <Shape key={at} shape={shape} ink={ink} />
            ))}
          </G>
        ),
      )}
    </Svg>
  );
}
