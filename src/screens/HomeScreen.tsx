import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIZES } from '../data/sizes';
import { THEMES } from '../data/themes';
import { progress } from '../game/board';
import type { SavedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption, ThemeDef } from '../puzzle/types';
import type { OverallStats } from '../stats/summary';
import { haptics } from '../ui/haptics';
import { palette, radius, shadow, space, tint } from '../ui/theme';
import { AppButton } from '../components/AppButton';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Props {
  theme: ThemeDef;
  size: SizeOption;
  busy: boolean;
  /** An unfinished game waiting to be picked back up, if there is one. */
  savedGame: SavedGame | null;
  stats: OverallStats;
  onSelectTheme: (theme: ThemeDef) => void;
  onSelectSize: (size: SizeOption) => void;
  onStart: () => void;
  onSurpriseMe: () => void;
  onResume: () => void;
  onDiscardSaved: () => void;
  onOpenStats: () => void;
}

export function HomeScreen({
  theme,
  size,
  busy,
  savedGame,
  stats,
  onSelectTheme,
  onSelectSize,
  onStart,
  onSurpriseMe,
  onResume,
  onDiscardSaved,
  onOpenStats,
}: Props) {
  const insets = useSafeAreaInsets();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const sizeStats = stats.sizes.find((entry) => entry.sizeId === size.id);
  const savedProgress = savedGame ? progress(savedGame.marks, savedGame.puzzle) : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space(6), paddingBottom: insets.bottom + space(40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Deduction, freshly generated</Text>
        <Text style={styles.title}>Logic Grid</Text>
        <Text style={styles.lede}>
          Pick a theme and a grid size. Every puzzle is built on the spot, has exactly one solution,
          and can be cracked by pure deduction — no guessing.
        </Text>

        {savedGame ? (
          <View
            style={[
              styles.resumeCard,
              shadow.card,
              { borderColor: savedGame.puzzle.accent, backgroundColor: tint(savedGame.puzzle.accent, 0.08) },
            ]}
          >
            <Text style={styles.resumeLabel}>Puzzle in progress</Text>
            <Text style={styles.resumeTitle}>
              {savedGame.puzzle.themeEmoji} {savedGame.puzzle.themeName} · {savedGame.puzzle.size.label}
            </Text>
            <Text style={styles.resumeMeta}>
              {Math.round(savedProgress * 100)}% filled in · {formatDuration(savedGame.seconds)} on the clock
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

        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeGrid}>
          {THEMES.map((option) => {
            const selected = option.id === theme.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  onSelectTheme(option);
                }}
                style={({ pressed }) => [
                  styles.themeCard,
                  shadow.card,
                  {
                    borderColor: selected ? option.accent : palette.line,
                    backgroundColor: selected ? tint(option.accent, 0.1) : palette.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.themeEmoji}>{option.emoji}</Text>
                <Text style={styles.themeName}>{option.name}</Text>
                <Text style={styles.themeBlurb}>{option.blurb}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Grid size</Text>
        <View style={styles.sizeRow}>
          {SIZES.map((option) => {
            const selected = option.id === size.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  onSelectSize(option);
                }}
                style={({ pressed }) => [
                  styles.sizeCard,
                  {
                    borderColor: selected ? theme.accent : palette.line,
                    backgroundColor: selected ? tint(theme.accent, 0.12) : palette.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.sizeLabel, selected && { color: theme.accent }]}>
                  {option.label}
                </Text>
                <Text style={styles.sizeBlurb}>{option.blurb}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sizeHint}>
          {size.items} items in each of {size.categories} categories —{' '}
          {(size.categories * (size.categories - 1)) / 2} grids to fill in.
        </Text>
        {sizeStats && sizeStats.solved > 0 ? (
          <Text style={styles.sizeStats}>
            {sizeStats.solved} solved · best {formatDuration(sizeStats.bestSeconds ?? 0)}
            {sizeStats.trend !== null && Math.abs(sizeStats.trend) >= 0.02
              ? ` · lately ${Math.round(Math.abs(sizeStats.trend) * 100)}% ${sizeStats.trend > 0 ? 'faster' : 'slower'}`
              : ''}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onOpenStats}
          style={({ pressed }) => [styles.statsRow, shadow.card, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.statsRowText}>
            <Text style={styles.statsRowTitle}>Statistics</Text>
            <Text style={styles.statsRowMeta}>
              {stats.solved === 0
                ? 'Finish a puzzle to start tracking your times'
                : `${stats.solved} solved · ${stats.currentStreak > 0 ? `${stats.currentStreak}-day streak` : 'no streak yet'}`}
            </Text>
          </View>
          <Text style={styles.statsRowChevron}>›</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(4) }]}>
        <AppButton
          label={busy ? 'Building puzzle…' : 'Start puzzle'}
          icon={busy ? '◦' : '▶'}
          accent={theme.accent}
          disabled={busy}
          onPress={onStart}
        />
        <AppButton
          label="Surprise me"
          variant="ghost"
          accent={palette.inkSoft}
          disabled={busy}
          onPress={onSurpriseMe}
          style={styles.surprise}
        />
      </View>

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

      {busy ? (
        // The generator runs on the JS thread; ActivityIndicator animates
        // natively, so it keeps spinning while the puzzle is being built.
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={theme.accent} />
            <Text style={styles.busyText}>Building your puzzle…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.inkFaint,
    marginTop: space(8),
    marginBottom: space(3),
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(3),
  },
  themeCard: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: space(4),
  },
  themeEmoji: {
    fontSize: 26,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
    marginTop: space(2),
  },
  themeBlurb: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSoft,
    marginTop: space(1),
  },
  sizeRow: {
    flexDirection: 'row',
    gap: space(2),
  },
  sizeCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: space(3),
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  sizeBlurb: {
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
  resumeCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: space(4),
    paddingHorizontal: space(4),
    marginTop: space(6),
  },
  statsRowText: {
    flex: 1,
  },
  statsRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  statsRowMeta: {
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: space(0.5),
  },
  statsRowChevron: {
    fontSize: 24,
    color: palette.inkFaint,
  },
  footer: {
    paddingHorizontal: space(5),
    paddingTop: space(4),
    backgroundColor: palette.bg,
    borderTopWidth: 1,
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
    backgroundColor: 'rgba(246, 243, 236, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
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
