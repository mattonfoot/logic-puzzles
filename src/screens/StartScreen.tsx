import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OverallStats } from '../stats/summary';
import { feedback } from '../ui/feedback';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, type Palette } from '../ui/theme';

interface Props {
  /** Whether a game is waiting to be picked back up, which Play leads to. */
  hasSavedGame: boolean;
  stats: OverallStats;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

/**
 * The front door: the three places the app goes. What to play is a screen of
 * its own, and the game left in progress waits there too — behind the same
 * Play — so this one has nothing to decide.
 */
export function StartScreen({ hasSavedGame, stats, onPlay, onOpenSettings, onOpenStats }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);

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

        <View style={styles.links}>
          <StartLink
            label="Play"
            note={
              hasSavedGame
                ? 'Pick your game back up, or start a new one'
                : 'Pick a difficulty and start a puzzle'
            }
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
        feedback.tap();
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
