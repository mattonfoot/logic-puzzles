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
 * drawn in the same box and filled with a single colour, so an icon takes the
 * colour of whatever it sits in and needs nothing else said about it.
 *
 * A name with no drawing behind it renders nothing rather than a broken box —
 * a game saved before an item was renamed still opens.
 */
export function Icon({ name, size = 24, color }: Props) {
  const palette = useTheme();
  const path = ICONS[name];
  if (!path) return null;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}>
      <Path d={path} fill={color ?? palette.ink} />
    </Svg>
  );
}
