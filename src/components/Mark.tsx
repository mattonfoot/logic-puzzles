import React from 'react';

import { Icon } from '../ui/Icon';

/**
 * A mark the player made, against one the board worked out for itself.
 *
 * The two are told apart by how heavily they are drawn and by nothing else.
 */
export type MarkWeight = 'hand' | 'auto';

/** Which of the four drawings a square wants. */
export function markIcon(kind: 'yes' | 'no', weight: MarkWeight): string {
  return `ui/mark-${kind === 'yes' ? 'tick' : 'cross'}-${weight}`;
}

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
 * These were typed characters until recently, which had two problems. The app's
 * face carries `✓` but not `✕`, so every cross on the board fell through to
 * whatever the system happened to have — a different drawing on an iPhone, a
 * Mac and a browser, none of them matching the tick beside it. And a family is
 * chosen per face here rather than by weight, so a glyph cannot be asked to
 * come out heavier: the only thing left to separate a mark the player made from
 * one the board filled in was colour, and colour alone is a distinction anyone
 * red-green blind, or reading in sunlight, does not get.
 *
 * They are drawings now, and they go through the same pipeline as every other
 * picture in the app: four SVG files in `assets/icons/ui`, read into path data
 * by `npm run icons`, drawn by the same `Icon` that draws a diver or a griffin.
 * That is what buys the control — the marks can be redrawn in a vector editor
 * without touching a line of code, they take their colour from whatever they
 * sit in, and each weight is its own artwork rather than a number multiplying
 * a stroke.
 *
 * Each is drawn at one thickness from end to end, and the heavy pair and the
 * light pair are the same shape at two of them, so the distinction reads at a
 * glance, reads in greyscale, and leaves colour to say the one thing it is good
 * at — that a mark is wrong.
 */
export function Mark({ kind, weight, size, color }: Props) {
  return <Icon name={markIcon(kind, weight)} size={size} color={color} />;
}
