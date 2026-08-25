import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '../game/time';
import type { Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { border, palette, space, tint } from '../ui/theme';
import { AppButton } from './AppButton';
import { SolutionTable } from './SolutionTable';

interface Props {
  /** "Solved!" normally, "Revealed" when the player asked for the answer. */
  title?: string;
  puzzle: Puzzle;
  seconds: number;
  hintsUsed: number;
  /** How this game compares with earlier ones; null until stats have loaded. */
  improvement: Improvement | null;
  onPlayAgain: () => void;
  onChangeSetup: () => void;
  onOpenStats: () => void;
}

/**
 * How the game finished: the clock, how it compares with earlier games, and the
 * answer as a table. It fills the tab it is shown in rather than covering the
 * board, so the finished grid stays one tap away.
 */
export function SolvedPanel({
  title = 'Solved!',
  puzzle,
  seconds,
  hintsUsed,
  improvement,
  onPlayAgain,
  onChangeSetup,
  onOpenStats,
}: Props) {
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
        <Stat label="Clues" value={`${puzzle.clues.length}`} accent={puzzle.accent} joined />
        <Stat label="Hints" value={`${hintsUsed}`} accent={puzzle.accent} joined />
      </View>

      {improvement ? (
        <View
          style={[
            styles.improvement,
            {
              backgroundColor: tint(improvement.kind === 'best' ? puzzle.accent : palette.ink, 0.08),
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

      <AppButton
        label="New puzzle"
        icon="↻"
        accent={puzzle.accent}
        onPress={onPlayAgain}
        style={styles.button}
      />
      <View style={styles.secondaryRow}>
        <AppButton
          label="Statistics"
          variant="ghost"
          accent={palette.inkSoft}
          onPress={onOpenStats}
          style={styles.secondaryButton}
        />
        <AppButton
          label="Change setup"
          variant="ghost"
          accent={palette.inkSoft}
          onPress={onChangeSetup}
          style={styles.secondaryButton}
        />
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
  return (
    <View style={[styles.stat, joined && styles.statJoined, { backgroundColor: tint(accent, 0.1) }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  secondaryRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  secondaryButton: {
    flex: 1,
    marginTop: space(1),
    paddingHorizontal: space(2),
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
  button: {
    alignSelf: 'stretch',
    marginTop: space(4),
  },
});
