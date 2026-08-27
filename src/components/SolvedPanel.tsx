import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatDuration } from '../game/time';
import type { Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, space, tint, type Palette } from '../ui/theme';
import { SolutionTable } from './SolutionTable';

interface Props {
  /** "Solved!" normally, "Revealed" when the player asked for the answer. */
  title?: string;
  puzzle: Puzzle;
  seconds: number;
  /** How many of the puzzle's clues the player read. */
  cluesUsed: number;
  /** How this game compares with earlier ones; null until stats have loaded. */
  improvement: Improvement | null;
}

/**
 * How the game finished: the clock, how it compares with earlier games, and the
 * answer as a table. It fills the tab it is shown in rather than covering the
 * board, so the finished grid stays one tap away.
 *
 * It offers nothing to press. Everything a player might want next — another
 * puzzle, a different difficulty, their statistics — lives behind the same
 * `<<< back` link as always, so the result is something to read rather than a
 * junction to get past.
 */
export function SolvedPanel({ title = 'Solved!', puzzle, seconds, cluesUsed, improvement }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.emoji}>{puzzle.themeEmoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {puzzle.themeName} · {puzzle.size.label}
      </Text>

      <View style={styles.stats}>
        <Stat label="Time" value={formatDuration(seconds)} accent={puzzle.accent} />
        <Stat label="Clues read" value={`${cluesUsed}`} accent={puzzle.accent} joined />
      </View>

      {improvement ? (
        <View
          style={[
            styles.improvement,
            {
              backgroundColor: tint(
                improvement.kind === 'best' ? puzzle.accent : palette.ink,
                0.08,
              ),
              borderColor: improvement.kind === 'best' ? puzzle.accent : palette.line,
            },
          ]}
        >
          <Text style={[styles.improvementHeadline, { color: puzzle.accent }]}>
            {improvement.kind === 'best' ? '🏆 ' : ''}
            {improvement.headline}
          </Text>
          <Text style={styles.improvementDetail}>{improvement.detail}</Text>
        </View>
      ) : null}

      <View style={styles.answer}>
        <Text style={styles.answerLabel}>The answer</Text>
        <SolutionTable puzzle={puzzle} compact />
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  accent,
  joined,
}: {
  label: string;
  value: string;
  accent: string;
  /** Sit flush against the block before it. */
  joined?: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View
      style={[styles.stat, joined && styles.statJoined, { backgroundColor: tint(accent, 0.1) }]}
    >
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    content: {
      alignItems: 'center',
      paddingBottom: space(4),
    },
    answer: {
      alignSelf: 'stretch',
      marginTop: space(5),
      paddingTop: space(4),
      borderTopWidth: border,
      borderTopColor: palette.line,
    },
    answerLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      marginBottom: space(2),
    },
    emoji: {
      fontSize: 44,
      marginTop: space(2),
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.ink,
      marginTop: space(2),
    },
    subtitle: {
      fontSize: 14,
      color: palette.inkSoft,
      marginTop: space(1),
    },
    stats: {
      flexDirection: 'row',
      marginTop: space(5),
      width: '100%',
    },
    improvement: {
      width: '100%',
      borderWidth: border,
      padding: space(4),
      marginTop: space(3),
    },
    improvementHeadline: {
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    improvementDetail: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkSoft,
      textAlign: 'center',
      marginTop: space(1),
    },
    statJoined: {
      borderLeftWidth: border,
      borderLeftColor: palette.surface,
    },
    stat: {
      flex: 1,
      paddingVertical: space(3),
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    statLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: palette.inkFaint,
      marginTop: space(1),
    },
  });
