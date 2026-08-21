import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIZES } from '../data/sizes';
import { THEMES } from '../data/themes';
import type { SizeOption, ThemeDef } from '../puzzle/types';
import { haptics } from '../ui/haptics';
import { palette, radius, shadow, space, tint } from '../ui/theme';
import { AppButton } from '../components/AppButton';

interface Props {
  theme: ThemeDef;
  size: SizeOption;
  busy: boolean;
  onSelectTheme: (theme: ThemeDef) => void;
  onSelectSize: (size: SizeOption) => void;
  onStart: () => void;
  onSurpriseMe: () => void;
}

export function HomeScreen({
  theme,
  size,
  busy,
  onSelectTheme,
  onSelectSize,
  onStart,
  onSurpriseMe,
}: Props) {
  const insets = useSafeAreaInsets();

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
