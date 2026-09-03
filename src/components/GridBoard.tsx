import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getEntry, markKey, type Cell, type Marks } from '../game/board';
import { boardLayout } from '../game/layout';
import type { Attribute, Puzzle } from '../puzzle/types';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { tint, type Palette } from '../ui/theme';
import { Mark } from './Mark';

interface Props {
  puzzle: Puzzle;
  marks: Marks;
  mistakes: Set<string>;
  /** Attributes a focused clue talks about; their rows and columns are tinted. */
  highlight: Attribute[];
  cellSize: number;
  onToggle: (cell: Cell) => void;
  /** A label was tapped: the player wants to know who or what that is. */
  onInspect: (attr: Attribute) => void;
}

/** The smallest cell worth tapping, and the largest the zoom will go to. */
export const MIN_CELL = 18;
export const MAX_CELL = 46;

const CATEGORY_STRIP = 14;
const LABEL_LINE = 14;
const CATEGORY_NAME = 20;
/** Between the row of pictures down the left and the first block of squares. */
const LABEL_GAP = 8;
/**
 * How much of its square a picture fills. Nearly all of it: the drawings carry
 * their own margin inside the box they are drawn in, and at the size a heading
 * gets there is none to spare — what tells two of a set apart is a hat or a
 * fringe, a few points across.
 */
const ICON_SCALE = 0.94;
/**
 * The band drawn around each pair grid. It is painted in the page colour rather
 * than as a line, so what separates one grid from the next is a gutter of
 * background — the squares' own shading is left to do the ruling. Blocks sit
 * flush, so the gutter where two grids meet is twice this.
 */
const BLOCK_BORDER = 2;
/**
 * How strongly a square that has been settled is washed — in the accent when it
 * is a match, in the danger colour when the mark on it is wrong.
 *
 * The wash is a background for a mark rather than a mark in its own right, and
 * the block it is painted in sets no background of its own, so it composites
 * over the *page* — which is paler than the board's squares and gives the mark
 * on top of it less to lift off than it looks like it does. It has to clear 3:1
 * against that mark on every colour the app can be drawn in, and the deeper cuts
 * were eating into it. `src/ui/__tests__/marks.test.ts` is what holds this
 * number down.
 */
export const SETTLED_TINT = 0.1;
/**
 * The largest cell whose whole staircase fits the space given — the size the
 * board opens at, so a puzzle needs no scrolling in either direction until the
 * player zooms in past it.
 *
 * An item is labelled by its own picture, drawn in a square the size of a cell,
 * so the headings grow and shrink with the board rather than holding a fixed
 * margin: there are `items × rows` squares plus the one the picture sits in,
 * on both axes.
 */
export function fitCellSize(
  puzzle: Puzzle,
  width: number,
  height: number,
  // How large a square is allowed to get. The board's own ceiling is the zoom's,
  // and it is set where a six-set staircase stops being one thing to look at.
  // The tutorial's single grid has nine squares and a screen to itself, so it
  // asks for a larger one rather than sitting marooned in the middle of the
  // room it was given.
  max = MAX_CELL,
): number {
  const rows = puzzle.categories.length - 1;
  const items = puzzle.size.items;
  const rules = rows * BLOCK_BORDER * 2;
  const squares = items * rows + 1;
  const byWidth = (width - CATEGORY_STRIP - LABEL_GAP - rules) / squares;
  const byHeight = (height - CATEGORY_NAME - rules) / squares;
  return Math.max(MIN_CELL, Math.min(max, Math.floor(Math.min(byWidth, byHeight))));
}

/**
 * The whole puzzle as one staircase of blocks, the way a printed logic grid is
 * laid out: every pair of sets meets in its own block, so a mark made in one
 * block can be cross-referenced against the others without leaving the board.
 *
 * An item is headed by its own picture rather than its name, on both axes. A
 * name long enough to read has to be turned on its side above a column and
 * shortened beside a row, and the two readings of the same item then look
 * nothing like each other; a silhouette is the same shape whichever edge it
 * sits on, and reads at a glance while the eye is on the squares. It costs the
 * board nothing either — the headings are now one square deep instead of the
 * best part of a hundred points, and the squares take what they leave.
 *
 * The picture is a button, which is what the item card is for: clues describe
 * things as well as name them, so a tap says which is which, in words.
 *
 * The set names and pictures down the left stay put while the blocks themselves
 * scroll sideways, so a wide board never loses its row headings.
 */
export function GridBoard({
  puzzle,
  marks,
  mistakes,
  highlight,
  cellSize,
  onToggle,
  onInspect,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const layout = useMemo(() => boardLayout(puzzle.categories.length), [puzzle]);
  const items = puzzle.size.items;
  // A block's box holds its own rule on each side, so the squares inside it
  // measure exactly `cellSize` and line up with the labels beside them.
  const blockSize = cellSize * items;
  const blockBox = blockSize + BLOCK_BORDER * 2;
  // A picture gets a square the size of a cell, so the headings are as tall and
  // as wide as one row and one column of the board.
  const iconSize = Math.round(cellSize * ICON_SCALE);
  const headerHeight = CATEGORY_NAME + cellSize;

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
        <View style={{ height: headerHeight }} />
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
                    color: palette.accent,
                  },
                ]}
              >
                {puzzle.categories[rowCategory].name}
              </Text>
            </View>

            <View style={{ width: cellSize + LABEL_GAP, paddingTop: BLOCK_BORDER }}>
              {puzzle.categories[rowCategory].items.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={`About ${item.label}`}
                  onPress={() => onInspect({ category: rowCategory, item: index })}
                  style={({ pressed }) => [
                    styles.rowLabel,
                    { height: cellSize, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={iconSize}
                    color={isLit(rowCategory, index) ? palette.accent : palette.inkSoft}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Column headers: set name, then each item written up the page. */}
          <View style={[styles.row, { height: headerHeight }]}>
            {layout.colCategories.map((category) => (
              <View
                key={`head-${category}`}
                style={[styles.columnBlock, { width: blockBox, height: headerHeight }]}
              >
                <Text style={[styles.categoryName, { color: palette.accent }]} numberOfLines={1}>
                  {puzzle.categories[category].name}
                </Text>
                <View style={styles.row}>
                  {puzzle.categories[category].items.map((item, index) => (
                    <Pressable
                      key={item.label}
                      accessibilityRole="button"
                      accessibilityLabel={`About ${item.label}`}
                      onPress={() => onInspect({ category, item: index })}
                      style={({ pressed }) => [
                        styles.columnLabel,
                        { width: cellSize, height: cellSize, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={iconSize}
                        color={isLit(category, index) ? palette.accent : palette.inkSoft}
                      />
                    </Pressable>
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
                                    ? tint(palette.danger, SETTLED_TINT)
                                    : mark === 'yes'
                                      ? tint(palette.accent, SETTLED_TINT)
                                      : crosshair
                                        ? tint(palette.accent, 0.07)
                                        : (rowItem + colItem) % 2 === 1
                                          ? palette.boardShade
                                          : palette.boardLight,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}
                            >
                              {mark === 'yes' || mark === 'no' ? (
                                <Mark
                                  kind={mark}
                                  // Colour says one thing — whether the mark is
                                  // wrong — and weight says the other: a mark
                                  // the player made is laid down heavily, one
                                  // the board filled in for itself lightly.
                                  weight={entry?.source === 'auto' ? 'auto' : 'hand'}
                                  size={cellSize}
                                  color={
                                    wrong
                                      ? palette.danger
                                      : mark === 'yes'
                                        ? palette.accent
                                        : palette.inkSoft
                                  }
                                />
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
    },
    categoryName: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      height: CATEGORY_NAME,
    },
    columnLabel: {
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingRight: LABEL_GAP,
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
  });
