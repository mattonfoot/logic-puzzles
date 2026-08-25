import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clueIcon, describeClue } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { Text } from '../ui/Text';
import { palette, radius, space, tint } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  crossedOut: Set<number>;
  onToggle: (index: number) => void;
  onFocus: (index: number) => void;
}

export function ClueList({ puzzle, crossedOut, onToggle, onFocus }: Props) {
  return (
    <View style={styles.list}>
      {puzzle.clues.map((clue, index) => {
        const done = crossedOut.has(index);
        return (
          <Pressable
            key={`${index}-${clue.kind}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityHint="Long press to jump to the matching grid"
            onPress={() => onToggle(index)}
            onLongPress={() => onFocus(index)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: done ? palette.surfaceAlt : tint(puzzle.accent, 0.12),
                  borderColor: done ? palette.line : tint(puzzle.accent, 0.35),
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: done ? palette.inkFaint : puzzle.accent }]}>
                {clueIcon(clue)}
              </Text>
            </View>
            <Text style={[styles.text, done && styles.textDone]}>{describeClue(clue, puzzle)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space(1),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(3),
    paddingVertical: space(2.5),
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: palette.ink,
  },
  textDone: {
    color: palette.inkFaint,
    textDecorationLine: 'line-through',
  },
});
