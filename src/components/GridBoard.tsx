import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getEntry, markKey, type Cell, type Marks } from '../game/board';
import { boardLayout } from '../game/layout';
import type { Attribute, Puzzle } from '../puzzle/types';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, tint, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  marks: Marks;
  mistakes: Set<string>;
  /** Attributes a focused clue talks about; their rows and columns are tinted. */
  highlight: Attribute[];
  cellSize: number;
  onToggle: (cell: Cell) => void;
}

/** The smallest cell worth tapping, and the largest the zoom will go to. */
export const MIN_CELL = 18;
export const MAX_CELL = 46;

const CATEGORY_STRIP = 14;
const ROW_LABEL = 76;
/** Room the rotated item labels get to write in — the longest item names fit. */
const LABEL_RUN = 88;
const LABEL_LINE = 14;
const CATEGORY_NAME = 20;
const HEADER_HEIGHT = LABEL_RUN + CATEGORY_NAME;
/**
 * The band drawn around each pair grid. It is painted in the page colour rather
 * than as a line, so what separates one grid from the next is a gutter of
 * background — the squares' own shading is left to do the ruling. Blocks sit
 * flush, so the gutter where two grids meet is twice this.
 */
const BLOCK_BORDER = 2;
/** Width the set strip and row labels take on the left of the board. */
const BOARD_LABELS = CATEGORY_STRIP + ROW_LABEL;

/**
 * The largest cell whose whole staircase fits the space given — the size the
 * board opens at, so a puzzle needs no scrolling in either direction until the
 * player zooms in past it.
 */
export function fitCellSize(puzzle: Puzzle, width: number, height: number): number {
  const rows = puzzle.categories.length - 1;
  const items = puzzle.size.items;
  const rules = rows * BLOCK_BORDER * 2;
  const byWidth = (width - BOARD_LABELS - rules) / (items * rows);
  const byHeight = (height - HEADER_HEIGHT - rules) / (items * rows);
  return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byWidth, byHeight))));
}

/**
 * The whole puzzle as one staircase of blocks, the way a printed logic grid is
 * laid out: every pair of sets meets in its own block, so a mark made in one
 * block can be cross-referenced against the others without leaving the board.
 *
 * The set names and item labels down the left stay put while the blocks
 * themselves scroll sideways, so a wide board never loses its row headings.
 */
export function GridBoard({ puzzle, marks, mistakes, highlight, cellSize, onToggle }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const layout = useMemo(() => boardLayout(puzzle.categories.length), [puzzle]);
  const items = puzzle.size.items;
  // A block's box holds its own rule on each side, so the squares inside it
  // measure exactly `cellSize` and line up with the labels beside them.
  const blockSize = cellSize * items;
  const blockBox = blockSize + BLOCK_BORDER * 2;

  const lit = useMemo(
    () => new Set(highlight.map((attr) => `${attr.category}.${attr.item}`)),
    [highlight],
  );
  const isLit = (category: number, item: number) => lit.has(`${category}.${item}`);

  const blockAt = (row: number, col: number) =>
    layout.blocks.find((block) => block.row === row && block.col === col);

  return (
    <View style={styles.row}>
      {/* Pinned: the set names and the item labels for each block row. */}
      <View>
        <View style={{ height: HEADER_HEIGHT }} />
        {layout.rowCategories.map((rowCategory) => (
          <View key={`labels-${rowCategory}`} style={[styles.row, { height: blockBox }]}>
            <View style={[styles.categoryStrip, { height: blockBox }]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryStripText,
                  {
                    width: blockBox,
                    maxWidth: blockBox,
                    left: (CATEGORY_STRIP - blockBox) / 2,
                    top: (blockBox - LABEL_LINE) / 2,
                    color: puzzle.accent,
                  },
                ]}
              >
                {puzzle.categories[rowCategory].name}
              </Text>
            </View>

            <View style={{ width: ROW_LABEL, paddingTop: BLOCK_BORDER }}>
              {puzzle.categories[rowCategory].items.map((item, index) => (
                <View key={item.label} style={[styles.rowLabel, { height: cellSize }]}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.rowLabelText, isLit(rowCategory, index) && styles.labelLit]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Column headers: set name, then each item written up the page. */}
          <View style={[styles.row, { height: HEADER_HEIGHT }]}>
            {layout.colCategories.map((category) => (
              <View key={`head-${category}`} style={[styles.columnBlock, { width: blockBox }]}>
                <Text style={[styles.categoryName, { color: puzzle.accent }]} numberOfLines={1}>
                  {puzzle.categories[category].name}
                </Text>
                <View style={styles.row}>
                  {puzzle.categories[category].items.map((item, index) => (
                    <View key={item.label} style={[styles.columnLabel, { width: cellSize }]}>
                      {/* Absolutely placed so the label is not squeezed into the
                          column width before it rotates. */}
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.columnLabelText,
                          {
                            width: LABEL_RUN,
                            maxWidth: LABEL_RUN,
                            left: (cellSize - LABEL_RUN) / 2,
                            top: (LABEL_RUN - LABEL_LINE) / 2,
                          },
                          isLit(category, index) && styles.labelLit,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {layout.rowCategories.map((rowCategory, row) => (
            <View key={`row-${rowCategory}`} style={[styles.row, { height: blockBox }]}>
              {layout.colCategories.map((colCategory, col) => {
                const block = blockAt(row, col);
                if (!block) {
                  return (
                    <View
                      key={`gap-${colCategory}`}
                      style={{ width: blockBox, height: blockBox }}
                    />
                  );
                }
                return (
                  <View
                    key={`block-${rowCategory}-${colCategory}`}
                    style={[styles.block, { width: blockBox, height: blockBox }]}
                  >
                    {puzzle.categories[rowCategory].items.map((_, rowItem) => (
                      <View key={rowItem} style={styles.row}>
                        {puzzle.categories[colCategory].items.map((__, colItem) => {
                          const cell: Cell = {
                            c1: rowCategory,
                            i1: rowItem,
                            c2: colCategory,
                            i2: colItem,
                          };
                          const entry = getEntry(marks, cell);
                          const mark = entry?.mark;
                          const wrong = mistakes.has(markKey(cell));
                          const crosshair =
                            isLit(rowCategory, rowItem) || isLit(colCategory, colItem);
                          return (
                            <Pressable
                              key={colItem}
                              accessibilityRole="button"
                              accessibilityLabel={`${puzzle.categories[rowCategory].items[rowItem].label} and ${puzzle.categories[colCategory].items[colItem].label}: ${
                                mark === 'yes' ? 'matched' : mark === 'no' ? 'ruled out' : 'unknown'
                              }`}
                              onPress={() => onToggle(cell)}
                              style={({ pressed }) => [
                                styles.cell,
                                {
                                  width: cellSize,
                                  height: cellSize,
                                  backgroundColor: wrong
                                    ? tint(palette.danger, 0.16)
                                    : mark === 'yes'
                                      ? tint(puzzle.accent, 0.16)
                                      : crosshair
                                        ? tint(puzzle.accent, 0.07)
                                        : (rowItem + colItem) % 2 === 1
                                          ? palette.boardShade
                                          : palette.boardLight,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                            >
                              {mark === 'yes' ? (
                                <Text
                                  style={[
                                    styles.tick,
                                    {
                                      fontSize: cellSize * 0.82,
                                      // The glyph gets the whole square, so a
                                      // big mark is centred rather than clipped.
                                      lineHeight: cellSize,
                                      // A tick the board worked out sits lighter
                                      // than one the player put down, the same
                                      // way its crosses do.
                                      color: wrong
                                        ? palette.danger
                                        : entry?.source === 'auto'
                                          ? tint(puzzle.accent, 0.55)
                                          : puzzle.accent,
                                    },
                                  ]}
                                >
                                  ✓
                                </Text>
                              ) : mark === 'no' ? (
                                <Text
                                  style={[
                                    styles.cross,
                                    { fontSize: cellSize * 0.68, lineHeight: cellSize },
                                    // Crosses the board filled in for a tick sit
                                    // lighter than the ones the player made.
                                    entry?.source === 'auto' && styles.crossAuto,
                                    wrong && { color: palette.danger },
                                  ]}
                                >
                                  ✕
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
    },
    columnBlock: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: HEADER_HEIGHT,
    },
    categoryName: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      height: CATEGORY_NAME,
    },
    columnLabel: {
      height: LABEL_RUN,
    },
    columnLabelText: {
      // Rotated so long item names fit above narrow columns.
      position: 'absolute',
      height: LABEL_LINE,
      lineHeight: LABEL_LINE,
      transform: [{ rotate: '-90deg' }],
      textAlign: 'right',
      fontSize: 11,
      fontWeight: '600',
      color: palette.inkSoft,
    },
    categoryStrip: {
      width: CATEGORY_STRIP,
    },
    categoryStripText: {
      position: 'absolute',
      height: LABEL_LINE,
      lineHeight: LABEL_LINE,
      transform: [{ rotate: '-90deg' }],
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    rowLabel: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: space(2),
    },
    rowLabelText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.ink,
    },
    labelLit: {
      color: palette.ink,
      textDecorationLine: 'underline',
    },
    block: {
      borderWidth: BLOCK_BORDER,
      borderColor: palette.bg,
      overflow: 'hidden',
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tick: {
      fontWeight: '700',
    },
    cross: {
      color: palette.inkSoft,
    },
    crossAuto: {
      // Lighter than a cross the player made, but only just faint enough to tell
      // them apart — the board's squares are tinted, so it cannot fade as far as
      // it could against white.
      color: palette.inkFaint,
      opacity: 0.85,
    },
  });
