import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { clueIcon, describeClue } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, space, tint, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Which clue is on the table, or null before the first one is asked for. */
  index: number | null;
  /** How many clues have been read, including this one. */
  used: number;
  /** The board already says everything this clue says. */
  done: boolean;
  /** Its rows and columns are lit up on the grid. */
  lit: boolean;
  onPress: () => void;
}

/** How far a used-up clue fades back, and how long it takes to get there. */
const FADED = 0.4;
const FADE_MS = 700;

/**
 * The one clue on the table.
 *
 * The player asks for clues one at a time rather than working down a list, so
 * this is where a clue lives while it is being used. Once the board says
 * everything the clue says it is struck through and fades back, which is the
 * game agreeing that it is spent — the next one replaces it on demand.
 *
 * Its height does not change with the clue, because the board above is sized to
 * the space left over and would jump about if it did.
 */
export function ClueCard({ puzzle, index, used, done, lit, onPress }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!done) {
      fade.setValue(1);
      return;
    }
    const animation = Animated.timing(fade, {
      toValue: FADED,
      duration: FADE_MS,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [done, index, fade]);

  if (index === null) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.emptyText}>
          No clue on the table. Tap “Get next clue” to read the first one.
        </Text>
      </View>
    );
  }

  const clue = puzzle.clues[index];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Clue, ${used} read${done ? ', used up' : ''}`}
      accessibilityHint={lit ? 'Stop lighting it up on the grid' : 'Light it up on the grid'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: lit ? palette.accent : palette.line, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Animated.View style={[styles.row, { opacity: fade }]}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: done ? palette.surfaceAlt : tint(palette.accent, 0.12),
              borderColor: done ? palette.line : palette.accentSoft,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: done ? palette.inkFaint : palette.accent }]}>
            {clueIcon(clue)}
          </Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.meta}>
            {used} clue{used === 1 ? '' : 's'} read{done ? ' · used up' : ''}
          </Text>
          <Text style={[styles.clue, done && styles.clueDone]} numberOfLines={3}>
            {describeClue(clue, puzzle)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    card: {
      // Tall enough for the longest clue a puzzle throws up, so the board above
      // keeps its size whichever one is showing.
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
      gap: space(3),
    },
    badge: {
      width: 28,
      height: 28,
      borderWidth: border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
    text: {
      flex: 1,
    },
    meta: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      marginBottom: space(1),
    },
    clue: {
      fontSize: 14,
      lineHeight: 19,
      color: palette.ink,
    },
    clueDone: {
      color: palette.inkFaint,
      textDecorationLine: 'line-through',
    },
  });
