import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { getMark, markKey, type Cell, type Marks } from '../game/board';
import type { Puzzle } from '../puzzle/types';
import { palette, radius, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  pair: [number, number];
  marks: Marks;
  mistakes: Set<string>;
  onToggle: (cell: Cell) => void;
}

const LABEL_WIDTH = 96;
const MIN_CELL = 34;
const MAX_CELL = 58;

export function PairGrid({ puzzle, pair, marks, mistakes, onToggle }: Props) {
  const { width } = useWindowDimensions();
  const [rowCategory, columnCategory] = pair;
  const rows = puzzle.categories[rowCategory];
  const columns = puzzle.categories[columnCategory];
  const size = puzzle.size.items;

  const cellSize = useMemo(() => {
    // 32 screen padding + 24 card padding + label gutter.
    const available = width - 32 - 24 - LABEL_WIDTH;
    return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(available / size)));
  }, [width, size]);

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={[styles.corner, { width: LABEL_WIDTH }]}>
          <Text style={styles.cornerText} numberOfLines={1}>
            {rows.name}
          </Text>
          <Text style={styles.cornerDivider}>↓</Text>
        </View>
        <View style={styles.columnHeaderBlock}>
          <Text style={[styles.columnCategory, { color: puzzle.accent }]} numberOfLines={1}>
            {columns.name}
          </Text>
          <View style={styles.row}>
            {columns.items.map((item) => (
              <View key={item.label} style={[styles.columnHeader, { width: cellSize }]}>
                <Text style={styles.columnHeaderText} numberOfLines={2} adjustsFontSizeToFit>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ width: LABEL_WIDTH }}>
          {rows.items.map((rowItem) => (
            <View key={rowItem.label} style={[styles.rowLabel, { height: cellSize }]}>
              <Text style={styles.rowLabelText} numberOfLines={1} adjustsFontSizeToFit>
                {rowItem.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.cellBlock}>
          {rows.items.map((rowItem, rowIndex) => (
            <View key={rowItem.label} style={styles.row}>
              {columns.items.map((columnItem, columnIndex) => {
              const cell: Cell = {
                c1: rowCategory,
                i1: rowIndex,
                c2: columnCategory,
                i2: columnIndex,
              };
              const mark = getMark(marks, cell);
              const isMistake = mistakes.has(markKey(cell));
              return (
                <Pressable
                  key={columnItem.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${rowItem.label} and ${columnItem.label}: ${
                    mark === 'yes' ? 'matched' : mark === 'no' ? 'ruled out' : 'unknown'
                  }`}
                  onPress={() => onToggle(cell)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRightWidth: columnIndex === size - 1 ? 0 : 1,
                      borderBottomWidth: rowIndex === size - 1 ? 0 : 1,
                      backgroundColor: isMistake
                        ? tint(palette.danger, 0.16)
                        : mark === 'yes'
                          ? tint(puzzle.accent, 0.14)
                          : palette.surface,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {mark === 'yes' ? (
                    <Text
                      style={[styles.tick, { color: isMistake ? palette.danger : puzzle.accent }]}
                    >
                      ✓
                    </Text>
                  ) : mark === 'no' ? (
                    <Text style={[styles.cross, isMistake && { color: palette.danger }]}>✕</Text>
                  ) : null}
                </Pressable>
              );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  corner: {
    paddingBottom: space(1),
    alignItems: 'flex-end',
    paddingRight: space(2),
  },
  cornerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkFaint,
  },
  cornerDivider: {
    fontSize: 10,
    color: palette.inkFaint,
  },
  columnHeaderBlock: {
    alignItems: 'center',
  },
  columnCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: space(1),
  },
  row: {
    flexDirection: 'row',
  },
  columnHeader: {
    height: 44,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: space(1),
  },
  columnHeaderText: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    color: palette.inkSoft,
    fontWeight: '600',
  },
  cellBlock: {
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
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
  cell: {
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    fontSize: 18,
    fontWeight: '700',
  },
  cross: {
    fontSize: 14,
    color: palette.inkFaint,
  },
});
