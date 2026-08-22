import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMark, markKey, type Cell, type Marks } from '../game/board';
import { boardLayout } from '../game/layout';
import type { Attribute, Puzzle } from '../puzzle/types';
import { palette, radius, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  marks: Marks;
  mistakes: Set<string>;
  /** Attributes a focused clue talks about; their rows and columns are tinted. */
  highlight: Attribute[];
  cellSize: number;
  onToggle: (cell: Cell) => void;
}

const CATEGORY_STRIP = 14;
const ROW_LABEL = 76;
/** Room the rotated item labels get to write in — the longest item names fit. */
const LABEL_RUN = 88;
const LABEL_LINE = 14;
const CATEGORY_NAME = 20;
const HEADER_HEIGHT = LABEL_RUN + CATEGORY_NAME;
const BLOCK_GAP = 4;

/**
 * The whole puzzle as one staircase of blocks, the way a printed logic grid is
 * laid out: every pair of sets meets in its own block, so a mark made in one
 * block can be cross-referenced against the others without leaving the board.
 *
 * The set names and item labels down the left stay put while the blocks
 * themselves scroll sideways, so a wide board never loses its row headings.
 */
export function GridBoard({ puzzle, marks, mistakes, highlight, cellSize, onToggle }: Props) {
  const layout = useMemo(() => boardLayout(puzzle.categories.length), [puzzle]);
  const items = puzzle.size.items;
  const blockSize = cellSize * items;
  const rowHeight = blockSize + BLOCK_GAP;

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
          <View key={`labels-${rowCategory}`} style={[styles.row, { height: rowHeight }]}>
            <View style={[styles.categoryStrip, { height: blockSize }]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryStripText,
                  {
                    width: blockSize,
                    maxWidth: blockSize,
                    left: (CATEGORY_STRIP - blockSize) / 2,
                    top: (blockSize - LABEL_LINE) / 2,
                    color: puzzle.accent,
                  },
                ]}
              >
                {puzzle.categories[rowCategory].name}
              </Text>
            </View>

            <View style={{ width: ROW_LABEL }}>
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
              <View
                key={`head-${category}`}
                style={[styles.columnBlock, { width: blockSize + BLOCK_GAP }]}
              >
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
            <View key={`row-${rowCategory}`} style={[styles.row, { height: rowHeight }]}>
              {layout.colCategories.map((colCategory, col) => {
                const block = blockAt(row, col);
                if (!block) {
                  return (
                    <View
                      key={`gap-${colCategory}`}
                      style={{ width: blockSize + BLOCK_GAP, height: blockSize }}
                    />
                  );
                }
                return (
                  <View
                    key={`block-${rowCategory}-${colCategory}`}
                    style={[styles.block, { width: blockSize, height: blockSize }]}
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
                          const mark = getMark(marks, cell);
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
                                  borderRightWidth: colItem === items - 1 ? 0 : 1,
                                  borderBottomWidth: rowItem === items - 1 ? 0 : 1,
                                  backgroundColor: wrong
                                    ? tint(palette.danger, 0.16)
                                    : mark === 'yes'
                                      ? tint(puzzle.accent, 0.16)
                                      : crosshair
                                        ? tint(puzzle.accent, 0.07)
                                        : palette.surface,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                            >
                              {mark === 'yes' ? (
                                <Text
                                  style={[
                                    styles.tick,
                                    {
                                      fontSize: cellSize * 0.55,
                                      color: wrong ? palette.danger : puzzle.accent,
                                    },
                                  ]}
                                >
                                  ✓
                                </Text>
                              ) : mark === 'no' ? (
                                <Text
                                  style={[
                                    styles.cross,
                                    { fontSize: cellSize * 0.42 },
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

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginRight: BLOCK_GAP,
    marginBottom: BLOCK_GAP,
  },
  cell: {
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    fontWeight: '700',
  },
  cross: {
    color: palette.inkFaint,
  },
});
