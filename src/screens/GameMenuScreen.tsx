import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Puzzle } from '../puzzle/types';
import { haptics } from '../ui/haptics';
import { Text } from '../ui/Text';
import { border, joinTop, palette, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate: boolean;
  /** Whether ticks that follow from other ticks are filled in. */
  autoFacts: boolean;
  /** A finished puzzle has nothing left to reveal. */
  solved: boolean;
  onToggleAutoEliminate: () => void;
  onToggleAutoFacts: () => void;
  onRestart: () => void;
  onNewPuzzle: () => void;
  onReveal: () => void;
  onClose: () => void;
}

/**
 * Everything that acts on the game as a whole rather than on a square: what the
 * board works out for itself, and the three ways to leave the puzzle behind.
 * They live here so the playing screen carries only what a player reaches for
 * mid-puzzle.
 */
export function GameMenuScreen({
  puzzle,
  autoEliminate,
  autoFacts,
  solved,
  onToggleAutoEliminate,
  onToggleAutoFacts,
  onRestart,
  onNewPuzzle,
  onReveal,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  // Told with this puzzle's own sets, so the rule reads as something about the
  // game in front of the player rather than about letters.
  const [first, second, third] = puzzle.categories.map((category) => category.name.toLowerCase());
  const a = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space(2) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close the menu"
          onPress={onClose}
          style={styles.headerButton}
          hitSlop={12}
        >
          <Text style={styles.headerButtonText}>✕</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Menu
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {puzzle.themeEmoji} {puzzle.themeName} · {puzzle.size.label} · #{puzzle.seed}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(6) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Board</Text>
        <Setting
          label="Automatic crosses"
          note="A tick crosses out the rest of its row and column for you. Your own crosses stay either way."
          on={autoEliminate}
          accent={puzzle.accent}
          onPress={onToggleAutoEliminate}
        />
        <Setting
          label="Auto add facts"
          note={`A tick that follows from the ticks already down is filled in: if ${a(first)} goes with ${a(second)}, and that ${second} goes with ${a(third)}, then the ${first} and the ${third} are paired too.`}
          on={autoFacts}
          accent={puzzle.accent}
          joined
          onPress={onToggleAutoFacts}
        />

        <Text style={styles.sectionLabel}>This puzzle</Text>
        <MenuAction
          label="Restart"
          note="Same puzzle, fresh board and clock."
          icon="↻"
          accent={puzzle.accent}
          onPress={onRestart}
        />
        <MenuAction
          label="New puzzle"
          note="A new theme, cast and answer."
          icon="✦"
          accent={puzzle.accent}
          joined
          onPress={onNewPuzzle}
        />
        {solved ? null : (
          <MenuAction
            label="Reveal the answer"
            note="Fills the board in and ends the game."
            icon="◉"
            accent={palette.danger}
            joined
            onPress={onReveal}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Setting({
  label,
  note,
  on,
  accent,
  joined,
  onPress,
}: {
  label: string;
  note: string;
  on: boolean;
  accent: string;
  /** Share the top edge with the row before it. */
  joined?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.row, joined && joinTop, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <View
        style={[
          styles.switch,
          {
            borderColor: on ? accent : palette.line,
            backgroundColor: on ? tint(accent, 0.12) : palette.surfaceAlt,
          },
        ]}
      >
        <Text style={[styles.switchText, { color: on ? accent : palette.inkFaint }]}>
          {on ? 'On' : 'Off'}
        </Text>
      </View>
    </Pressable>
  );
}

function MenuAction({
  label,
  note,
  icon,
  accent,
  joined,
  onPress,
}: {
  label: string;
  note: string;
  icon: string;
  accent: string;
  /** Share the top edge with the row before it. */
  joined?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.row, joined && joinTop, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Text style={[styles.rowIcon, { color: accent }]}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: accent }]}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingBottom: space(3),
    gap: space(3),
    borderBottomWidth: border,
    borderBottomColor: palette.line,
  },
  headerButton: {
    width: 34,
    height: 34,
    backgroundColor: palette.surface,
    borderWidth: border,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: palette.ink,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.inkFaint,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: space(4),
    paddingTop: space(4),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.inkFaint,
    marginTop: space(5),
    marginBottom: space(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(4),
    backgroundColor: palette.surface,
    borderWidth: border,
    borderColor: palette.line,
  },
  rowIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  rowNote: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSoft,
    marginTop: space(0.5),
  },
  switch: {
    minWidth: 46,
    paddingVertical: space(1),
    paddingHorizontal: space(2),
    borderWidth: border,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
