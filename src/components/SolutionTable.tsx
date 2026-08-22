import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { solutionRows } from '../game/layout';
import type { Puzzle } from '../puzzle/types';
import { palette, radius, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Slightly tighter type for the win overlay. */
  compact?: boolean;
}

const MIN_COLUMN = 76;

/**
 * The answer as a table: one row per person, one column per set, so the whole
 * solution can be read across in a line.
 */
export function SolutionTable({ puzzle, compact = false }: Props) {
  const rows = solutionRows(puzzle);
  const columnWidth = Math.max(MIN_COLUMN, compact ? 78 : 88);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.headerRow}>
          {puzzle.categories.map((category) => (
            <Text
              key={category.id}
              numberOfLines={2}
              style={[styles.headerCell, { width: columnWidth, color: puzzle.accent }]}
            >
              {category.name}
            </Text>
          ))}
        </View>

        {rows.map((row, index) => (
          <View
            key={row[0].label}
            style={[
              styles.row,
              { backgroundColor: index % 2 ? tint(puzzle.accent, 0.05) : 'transparent' },
            ]}
          >
            {row.map((cell, column) => (
              <Text
                key={`${cell.category}-${cell.item}`}
                numberOfLines={2}
                style={[
                  styles.cell,
                  { width: columnWidth },
                  compact && styles.cellCompact,
                  column === 0 && styles.cellLead,
                ]}
              >
                {cell.label}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingBottom: space(1.5),
  },
  headerCell: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: space(1.5),
  },
  row: {
    flexDirection: 'row',
    borderRadius: radius.sm,
  },
  cell: {
    fontSize: 13,
    lineHeight: 17,
    color: palette.inkSoft,
    paddingVertical: space(2),
    paddingHorizontal: space(1.5),
  },
  cellCompact: {
    fontSize: 12,
    lineHeight: 15,
    paddingVertical: space(1.5),
  },
  cellLead: {
    color: palette.ink,
    fontWeight: '700',
  },
});
