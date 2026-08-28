import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { describeClue } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, space, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Which clue is on the table, or null before the first one is asked for. */
  index: number | null;
  /** Its rows and columns are lit up on the grid. */
  lit: boolean;
  onPress: () => void;
}

/**
 * The one clue on the table.
 *
 * The player asks for clues one at a time rather than working down a list, so
 * this is where a clue lives while it is being used.
 *
 * It reads the same whether or not the board has caught up with it. Striking a
 * clue through the moment its last mark went down was the game marking the
 * player's work: it said "that one is finished with" before they had decided it
 * was, and turned the panel into a checklist to clear rather than a sentence to
 * think about. Whether a clue still has something to give is exactly the thing
 * worth working out, so the game keeps its opinion to itself. It still tracks
 * which clues are spent — that is how the button knows which one to hand over
 * next — but it does not say.
 *
 * Its height does not change with the clue, because the board above is sized to
 * the space left over and would jump about if it did.
 */
export function ClueCard({ puzzle, index, lit, onPress }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  if (index === null) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.emptyText}>
          No clue on the table. Tap “Clue” to read the first one.
        </Text>
      </View>
    );
  }

  const clue = puzzle.clues[index];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Clue in play"
      accessibilityHint={lit ? 'Stop lighting it up on the grid' : 'Light it up on the grid'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: lit ? palette.accent : palette.line, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.clue} numberOfLines={3}>
          {describeClue(clue, puzzle)}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    card: {
      // Takes the width the buttons beside it leave, and is tall enough for the
      // longest clue a puzzle throws up, so the board above keeps its size
      // whichever one is showing.
      flex: 1,
      minHeight: 84,
      justifyContent: 'center',
      paddingVertical: space(2.5),
      paddingHorizontal: space(3),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
    },
    empty: {
      backgroundColor: palette.surfaceAlt,
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkFaint,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clue: {
      flex: 1,
      fontSize: 14,
      lineHeight: 19,
      color: palette.ink,
    },
  });
