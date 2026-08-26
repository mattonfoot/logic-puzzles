import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { SIZES } from '../data/sizes';
import { THEMES } from '../data/themes';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';
import type { OverallStats } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  busy: boolean;
  stats: OverallStats;
  /** Picking a difficulty is starting the puzzle; there is nothing else to say. */
  onStart: (size: SizeOption) => void;
  onSurpriseMe: () => void;
  onBack: () => void;
}

/**
 * What to play: how big the grid is, which is the only thing about a puzzle the
 * player chooses. Everything else — the theme, the cast, the answer — is drawn
 * when the game starts.
 */
export function SetupScreen({ busy, stats, onStart, onSurpriseMe, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New puzzle" onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(8) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Difficulty</Text>
        <View style={styles.sizeRow}>
          {SIZES.map((option) => {
            const played = stats.sizes.find((entry) => entry.sizeId === option.id);
            const best =
              played && played.solved > 0
                ? `best ${formatDuration(played.bestSeconds ?? 0)}`
                : null;
            return (
              <Choice
                key={option.id}
                title={option.difficulty}
                note={`${option.items} items in each of ${option.categories} sets · ${
                  (option.categories * (option.categories - 1)) / 2
                } grids`}
                aside={option.label}
                footnote={best}
                disabled={busy}
                onPress={() => onStart(option)}
              />
            );
          })}
          <Choice
            title="Surprise me!"
            note="Any of the four, rolled for you"
            aside="?"
            accent
            disabled={busy}
            onPress={onSurpriseMe}
          />
        </View>

        <View style={[styles.themeNote, shadow.card]}>
          <Text style={styles.themeNoteLabel}>Theme</Text>
          <Text style={styles.themeNoteTitle}>Drawn at random</Text>
          <Text style={styles.themeNoteText}>
            One of {THEMES.length} settings, with its sets and items picked from a much larger cast.
          </Text>
          <Text style={styles.themeNoteEmoji}>
            {THEMES.map((option) => option.emoji).join('  ')}
          </Text>
        </View>
      </ScrollView>

      {busy ? (
        // The generator runs on the JS thread; ActivityIndicator animates
        // natively, so it keeps spinning while the puzzle is being built.
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.busyText}>Building your puzzle…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Choice({
  title,
  note,
  aside,
  footnote,
  accent = false,
  disabled,
  onPress,
}: {
  title: string;
  note: string;
  /** The shape, or a question mark for the one that rolls it. */
  aside: string;
  /** What the player has done at this difficulty before, if anything. */
  footnote?: string | null;
  accent?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${note}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.sizeCard,
        {
          borderColor: accent ? palette.accent : palette.line,
          backgroundColor: accent ? tint(palette.accent, 0.1) : palette.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.sizeText}>
        <Text style={[styles.sizeLabel, accent && { color: palette.accent }]}>{title}</Text>
        <Text style={styles.sizeNote}>{note}</Text>
        {footnote ? <Text style={styles.sizeStats}>{footnote}</Text> : null}
      </View>
      <Text style={[styles.sizeShape, accent && { color: palette.accent }]}>{aside}</Text>
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
      paddingTop: space(4),
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      marginBottom: space(3),
    },
    sizeRow: {
      // One under another, so each difficulty is a line to read rather than a
      // box to decode. They sit apart rather than flush: the chosen one draws
      // its border in the accent, and a neighbour sharing that edge paints
      // over it.
      gap: space(2),
    },
    sizeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(3),
      borderWidth: border,
      paddingVertical: space(3.5),
      paddingHorizontal: space(4),
    },
    sizeText: {
      flex: 1,
    },
    sizeNote: {
      fontSize: 12,
      color: palette.inkSoft,
      marginTop: space(0.5),
    },
    sizeLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.ink,
    },
    sizeShape: {
      fontSize: 13,
      color: palette.inkFaint,
    },
    sizeStats: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(0.5),
    },
    themeNote: {
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      padding: space(4),
      marginTop: space(8),
    },
    themeNoteLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
    },
    themeNoteTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.ink,
      marginTop: space(1.5),
    },
    themeNoteText: {
      fontSize: 13,
      lineHeight: 19,
      color: palette.inkSoft,
      marginTop: space(1),
    },
    themeNoteEmoji: {
      fontSize: 20,
      marginTop: space(3),
    },
    footer: {
      paddingHorizontal: space(5),
      paddingTop: space(4),
      backgroundColor: palette.bg,
      borderTopWidth: border,
      borderTopColor: palette.line,
    },
    busyOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: tint(palette.bg, 0.72),
      alignItems: 'center',
      justifyContent: 'center',
    },
    busyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      paddingVertical: space(3),
      paddingHorizontal: space(5),
    },
    busyText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.ink,
    },
  });
