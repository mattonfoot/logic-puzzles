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
  size: SizeOption;
  busy: boolean;
  stats: OverallStats;
  onSelectSize: (size: SizeOption) => void;
  onStart: () => void;
  onSurpriseMe: () => void;
  onBack: () => void;
}

/**
 * What to play: how big the grid is, which is the only thing about a puzzle the
 * player chooses. Everything else — the theme, the cast, the answer — is drawn
 * when the game starts.
 */
export function SetupScreen({
  size,
  busy,
  stats,
  onSelectSize,
  onStart,
  onSurpriseMe,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const sizeStats = stats.sizes.find((entry) => entry.sizeId === size.id);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New puzzle" onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Difficulty</Text>
        <View style={styles.sizeRow}>
          {SIZES.map((option) => {
            const selected = option.id === size.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={`${option.difficulty}, ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  onSelectSize(option);
                }}
                style={({ pressed }) => [
                  styles.sizeCard,
                  {
                    borderColor: selected ? palette.accent : palette.line,
                    backgroundColor: selected ? tint(palette.accent, 0.12) : palette.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.sizeLabel, selected && { color: palette.accent }]}>
                  {option.difficulty}
                </Text>
                <Text style={styles.sizeShape}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sizeHint}>
          {size.difficulty} is a {size.label} puzzle: {size.items} items in each of{' '}
          {size.categories} categories, {(size.categories * (size.categories - 1)) / 2} grids to
          fill in.
        </Text>
        {sizeStats && sizeStats.solved > 0 ? (
          <Text style={styles.sizeStats}>
            {sizeStats.solved} solved · best {formatDuration(sizeStats.bestSeconds ?? 0)}
            {sizeStats.trend !== null && Math.abs(sizeStats.trend) >= 0.02
              ? ` · lately ${Math.round(Math.abs(sizeStats.trend) * 100)}% ${sizeStats.trend > 0 ? 'faster' : 'slower'}`
              : ''}
          </Text>
        ) : null}

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

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(4) }]}>
        <AppButton
          label={busy ? 'Building puzzle…' : 'Start puzzle'}
          icon={busy ? '◦' : '▶'}
          accent={palette.accent}
          disabled={busy}
          onPress={onStart}
        />
        <AppButton
          label="Random difficulty"
          variant="ghost"
          accent={palette.inkSoft}
          disabled={busy}
          onPress={onSurpriseMe}
          style={styles.surprise}
        />
      </View>

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
      flexDirection: 'row',
      // These sit apart rather than flush: the chosen size draws its border in
      // the accent, and a neighbour sharing that edge paints over it.
      gap: space(2),
    },
    sizeCard: {
      flex: 1,
      borderWidth: border,
      paddingVertical: space(3),
      alignItems: 'center',
    },
    sizeLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.ink,
    },
    sizeShape: {
      fontSize: 11,
      color: palette.inkFaint,
      marginTop: space(0.5),
    },
    sizeHint: {
      fontSize: 13,
      color: palette.inkSoft,
      marginTop: space(3),
    },
    sizeStats: {
      fontSize: 13,
      color: palette.inkFaint,
      marginTop: space(1),
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
    surprise: {
      marginTop: space(1),
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
