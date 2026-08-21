import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '../game/useTimer';
import type { Puzzle } from '../puzzle/types';
import { palette, radius, shadow, space, tint } from '../ui/theme';
import { AppButton } from './AppButton';

interface Props {
  visible: boolean;
  /** "Solved!" normally, "Revealed" when the player asked for the answer. */
  title?: string;
  puzzle: Puzzle;
  seconds: number;
  hintsUsed: number;
  onPlayAgain: () => void;
  onChangeSetup: () => void;
}

export function WinOverlay({
  visible,
  title = 'Solved!',
  puzzle,
  seconds,
  hintsUsed,
  onPlayAgain,
  onChangeSetup,
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

          <AppButton
            label="New puzzle"
            icon="↻"
            accent={puzzle.accent}
            onPress={onPlayAgain}
            style={styles.button}
          />
          <AppButton
            label="Change setup"
            variant="ghost"
            accent={palette.inkSoft}
            onPress={onChangeSetup}
            style={styles.button}
          />
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
    marginVertical: space(5),
    width: '100%',
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
    marginTop: space(2),
  },
});
