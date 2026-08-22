import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '../game/time';
import type { Puzzle } from '../puzzle/types';
import type { Improvement } from '../stats/summary';
import { palette, radius, shadow, space, tint } from '../ui/theme';
import { AppButton } from './AppButton';

interface Props {
  visible: boolean;
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

export function WinOverlay({
  visible,
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChangeSetup}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadow.raised]}>
          <Text style={styles.emoji}>{puzzle.themeEmoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {puzzle.themeName} · {puzzle.size.label}
          </Text>

          <View style={styles.stats}>
            <Stat label="Time" value={formatDuration(seconds)} accent={puzzle.accent} />
            <Stat label="Clues" value={`${puzzle.clues.length}`} accent={puzzle.accent} />
            <Stat label="Hints" value={`${hintsUsed}`} accent={puzzle.accent} />
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
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tint(accent, 0.1) }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24, 22, 18, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(6),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: space(6),
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
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
    gap: space(2),
    marginTop: space(5),
    width: '100%',
  },
  improvement: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
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
    gap: space(2),
  },
  secondaryButton: {
    flex: 1,
    marginTop: space(1),
    paddingHorizontal: space(2),
  },
  stat: {
    flex: 1,
    borderRadius: radius.md,
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
