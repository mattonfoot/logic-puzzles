import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { inkOn, radius, space, tint, type Palette } from './theme';

interface Props {
  label: string;
  accent: string;
  disabled?: boolean;
  /** A switch rather than an action: filled when it is on. */
  active?: boolean;
  onPress: () => void;
}

/**
 * One of the words a board is worked with: Undo, Clue, Info, Highlight.
 *
 * `active` is for the one that is a switch rather than an action: it fills with
 * the colour instead of outlining it, so a glance says whether the highlight is
 * on without having to look at the board to find out.
 *
 * It lives here rather than beside the game screen because a lesson is worked
 * with the same four words on the same row. A lesson that taught the game on a
 * near-copy of its controls would be teaching a board the player is about to
 * stop having.
 */
export function ToolButton({ label, accent, disabled = false, active = false, onPress }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        {
          borderColor: active ? accent : tint(accent, 0.4),
          backgroundColor: active ? accent : palette.surface,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[styles.label, { color: active ? inkOn(accent, '#FFFFFF', palette.ink) : accent }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    tool: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(2.5),
      paddingHorizontal: space(4),
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
