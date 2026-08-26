import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { solutionRows, type SolutionCell } from '../game/layout';
import type { Puzzle } from '../puzzle/types';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, tint, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Slightly tighter type for the win overlay. */
  compact?: boolean;
}

/**
 * The answer as a table: one row per person, one column per set, so the whole
 * solution can be read across in a line.
 *
 * The first set stays pinned while the rest scroll sideways, which keeps the
 * headings on one line each however long the set names are.
 */
export function SolutionTable({ puzzle, compact = false }: Props) {
  const styles = useStyles(makeStyles);
  const rows = solutionRows(puzzle);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const overflows = content > viewport + 4;
  const columnWidth = compact ? 96 : 104;
  const rowHeight = compact ? 28 : 32;
  const headerHeight = compact ? 22 : 26;

  const cell = (entry: SolutionCell, lead: boolean, index: number) => (
    <View
      key={`${entry.category}-${entry.item}`}
      style={[
        styles.cell,
        {
          width: columnWidth,
          height: rowHeight,
          backgroundColor: index % 2 ? tint(puzzle.accent, 0.05) : 'transparent',
        },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.cellText, compact && styles.cellTextCompact, lead && styles.cellTextLead]}
      >
        {entry.label}
      </Text>
    </View>
  );

  const header = (name: string) => (
    <View key={name} style={[styles.headerCell, { width: columnWidth, height: headerHeight }]}>
      <Text numberOfLines={1} style={[styles.headerText, { color: puzzle.accent }]}>
        {name}
      </Text>
    </View>
  );

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.pinned}>
          {header(puzzle.categories[0].name)}
          {rows.map((row, index) => cell(row[0], true, index))}
        </View>

        {/* Shrinks below its content width so the remaining sets scroll rather
            than spilling past the edge of the card. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
          onContentSizeChange={(width) => setContent(width)}
        >
          <View>
            <View style={styles.row}>
              {puzzle.categories.slice(1).map((category) => header(category.name))}
            </View>
            {rows.map((row, index) => (
              <View key={row[0].label} style={styles.row}>
                {row.slice(1).map((entry) => cell(entry, false, index))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {overflows ? <Text style={styles.hint}>Swipe the table for the other sets</Text> : null}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
    },
    pinned: {
      borderRightWidth: 1,
      borderRightColor: palette.line,
    },
    scroller: {
      flexShrink: 1,
    },
    headerCell: {
      justifyContent: 'flex-end',
      paddingHorizontal: space(1.5),
      paddingBottom: space(1),
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    headerText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    cell: {
      justifyContent: 'center',
      paddingHorizontal: space(1.5),
    },
    cellText: {
      fontSize: 13,
      color: palette.inkSoft,
    },
    cellTextCompact: {
      fontSize: 12,
    },
    cellTextLead: {
      color: palette.ink,
      fontWeight: '700',
    },
    hint: {
      fontSize: 11,
      color: palette.inkFaint,
      marginTop: space(2),
    },
  });
