import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** The box the two marks are drawn in; every number below is in its units. */
const BOX = 24;

/**
 * A mark the player made, against one the board worked out for itself.
 *
 * The two are told apart by how heavily they are drawn and by nothing else.
 */
export type MarkWeight = 'hand' | 'auto';

const STROKE: Record<MarkWeight, number> = {
  hand: 3.2,
  auto: 1.4,
};

/**
 * A tick that leans the way a written one does, and a cross of two even
 * strokes. Both are drawn well inside the box: a mark sits in the middle of its
 * square rather than filling it, so the checkerboard underneath still reads.
 */
const TICK = 'M4.5 12.4 L9.8 17.8 L19.5 6.6';
const CROSS = 'M6.4 6.4 L17.6 17.6 M17.6 6.4 L6.4 17.6';

interface Props {
  /** A match or a ruling-out. */
  kind: 'yes' | 'no';
  /** Who put it there. */
  weight: MarkWeight;
  /** The square's width; the mark is drawn to fill it. */
  size: number;
  color: string;
}

/**
 * The tick and the cross on the board.
 *
 * These were typed characters until now, which had two problems. The app's
 * face carries `✓` but not `✕`, so every cross on the board fell through to
 * whatever the system happened to have — a different drawing on an iPhone,
 * a Mac and a browser, none of them matching the tick beside it. And a family
 * is chosen per face here rather than by weight, so a glyph cannot be asked to
 * come out heavier: the only thing left to separate a mark the player made from
 * one the board filled in was colour, and colour alone is a distinction anyone
 * red-green blind, or reading in sunlight, does not get.
 *
 * Drawn as strokes instead, both problems go together. The two marks are the
 * same shape and the same colour whoever made them; a hand mark is laid down
 * more than twice as thick as an automatic one, which reads at a glance and
 * reads in greyscale. Colour is left to say the one thing it is good at — that
 * something is wrong — rather than three things at once.
 */
export function Mark({ kind, weight, size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
      <Path
        d={kind === 'yes' ? TICK : CROSS}
        stroke={color}
        strokeWidth={STROKE[weight]}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
