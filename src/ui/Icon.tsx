import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { ICON_BOX, ICONS } from './icons.generated';
import { useTheme } from './ThemeProvider';

interface Props {
  /** Which drawing, e.g. `quest/beast-griffin`. */
  name: string;
  size?: number;
  /** Defaults to the page's ink. */
  color?: string;
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
 * are one filled shape and nothing more; some are several, and some are drawn
 * as a line of a given width rather than filled. Which it is belongs to the
 * artwork, so it is read off the file rather than decided here — all this does
 * is hand each shape the one colour they all share.
 *
 * A name with no drawing behind it renders nothing rather than a broken box —
 * a game saved before an item was renamed still opens.
 */
export function Icon({ name, size = 24, color }: Props) {
  const palette = useTheme();
  const shapes = ICONS[name];
  if (!shapes) return null;
  const ink = color ?? palette.ink;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}>
      {shapes.map((shape, index) => (
        <Path
          // The shapes of one drawing are a fixed list in a fixed order, so
          // their place in it is the only name they have or need.
          key={index}
          d={shape.d}
          fill={shape.stroke ? 'none' : ink}
          fillRule={shape.evenOdd ? 'evenodd' : 'nonzero'}
          stroke={shape.stroke ? ink : undefined}
          strokeWidth={shape.stroke}
          strokeLinecap={shape.cap}
          strokeLinejoin={shape.join}
        />
      ))}
    </Svg>
  );
}
