import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { progress } from '../game/board';
import type { SavedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { OverallStats } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  /** An unfinished game waiting to be picked back up, if there is one. */
  savedGame: SavedGame | null;
  stats: OverallStats;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onResume: () => void;
  onDiscardSaved: () => void;
}

/**
 * The front door: the three places the app goes, and the game left in progress
 * if there is one. Choosing what to play is a screen of its own, so this one
 * has nothing to decide.
 */
export function StartScreen({
  savedGame,
  stats,
  onPlay,
  onOpenSettings,
  onOpenStats,
  onResume,
  onDiscardSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const savedProgress = savedGame ? progress(savedGame.marks, savedGame.puzzle) : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space(8), paddingBottom: insets.bottom + space(8) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Deduction, freshly generated</Text>
        <Text style={styles.title}>Logic Grid</Text>
        <Text style={styles.lede}>
          Every puzzle is built when you ask for it, with exactly one solution you can reach by pure
          deduction — no guessing.
        </Text>

        {savedGame ? (
          <View
            style={[
              styles.resumeCard,
              shadow.card,
              {
                borderColor: savedGame.puzzle.accent,
                backgroundColor: tint(savedGame.puzzle.accent, 0.08),
              },
            ]}
          >
            <Text style={styles.resumeLabel}>Puzzle in progress</Text>
            <Text style={styles.resumeTitle}>
              {savedGame.puzzle.themeEmoji} {savedGame.puzzle.themeName} ·{' '}
              {savedGame.puzzle.size.label}
            </Text>
            <Text style={styles.resumeMeta}>
              {Math.round(savedProgress * 100)}% filled in · {formatDuration(savedGame.seconds)} on
              the clock
            </Text>
            <View style={styles.resumeButtons}>
              <AppButton
                label="Resume"
                icon="▶"
                accent={savedGame.puzzle.accent}
                onPress={onResume}
                style={styles.resumeButton}
              />
              <AppButton
                label="Discard"
                variant="ghost"
                accent={palette.inkSoft}
                onPress={() => setConfirmingDiscard(true)}
                style={styles.resumeButton}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.links}>
          <StartLink
            label="Play"
            note="Pick a size and start a new puzzle"
            icon="▶"
            onPress={onPlay}
          />
          <StartLink
            label="Settings"
            note="How the board helps, and how the app looks"
            icon="⚙"
            onPress={onOpenSettings}
          />
          <StartLink
            label="Statistics"
            note={
              stats.solved === 0
                ? 'Finish a puzzle to start tracking your times'
                : `${stats.solved} solved · ${
                    stats.currentStreak > 0 ? `${stats.currentStreak}-day streak` : 'no streak yet'
                  }`
            }
            icon="◴"
            onPress={onOpenStats}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmingDiscard}
        title="Discard the saved puzzle?"
        message="Your progress on it will be lost."
        confirmLabel="Discard it"
        onConfirm={() => {
          setConfirmingDiscard(false);
          onDiscardSaved();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </View>
  );
}

function StartLink({
  label,
  note,
  icon,
  onPress,
}: {
  label: string;
  note: string;
  icon: string;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.link, shadow.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.linkIcon, { color: palette.accent }]}>{icon}</Text>
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkNote}>{note}</Text>
      </View>
      <Text style={styles.linkChevron}>›</Text>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    content: {
      paddingHorizontal: space(5),
    },
    eyebrow: {
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      fontWeight: '700',
    },
    title: {
      fontSize: 40,
      fontWeight: '800',
      color: palette.ink,
      marginTop: space(1),
      letterSpacing: -0.5,
    },
    lede: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.inkSoft,
      marginTop: space(2),
    },
    resumeCard: {
      borderWidth: border,
      padding: space(4),
      marginTop: space(6),
    },
    resumeLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
    },
    resumeTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.ink,
      marginTop: space(1.5),
    },
    resumeMeta: {
      fontSize: 13,
      color: palette.inkSoft,
      marginTop: space(1),
    },
    resumeButtons: {
      flexDirection: 'row',
      gap: space(2),
      marginTop: space(3),
    },
    resumeButton: {
      flex: 1,
    },
    links: {
      marginTop: space(6),
      gap: space(3),
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      paddingVertical: space(4),
      paddingHorizontal: space(4),
    },
    linkIcon: {
      fontSize: 18,
      width: 24,
      textAlign: 'center',
    },
    linkText: {
      flex: 1,
    },
    linkLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.ink,
    },
    linkNote: {
      fontSize: 13,
      color: palette.inkSoft,
      marginTop: space(0.5),
    },
    linkChevron: {
      fontSize: 24,
      color: palette.inkFaint,
    },
  });
