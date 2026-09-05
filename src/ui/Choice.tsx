import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { feedback } from './feedback';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { space, type, type Palette } from './theme';

interface Props {
  label: string;
  /**
   * What is being chosen, for somebody being read the screen. It is not set on
   * the page: a list of words the same size is the whole design, and a second
   * line under each of them would be a different one.
   */
  hint?: string;
  disabled?: boolean;
  /**
   * Which step of the menu scale to set it in. `long` is for a list whose
   * choices are named in phrases rather than words, where the ordinary size
   * would wrap a row onto two lines.
   */
  size?: 'menu' | 'long';
  onPress: () => void;
}

/**
 * One choice in a list of them, set as large as the app sets anything.
 *
 * Every screen before a board asks the same kind of question — which offer,
 * which difficulty, which puzzle, which lesson — so every screen before a board
 * asks it in the same words at the same size. That only stays true if there is
 * one of these rather than one per screen, which is what this is: the row, its
 * air, its accent and its press.
 */
export function Choice({ label, hint, disabled = false, size = 'menu', onPress }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.choice, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[size === 'long' ? styles.long : styles.label, { color: palette.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    choice: {
      // Only as wide as the word, so the tap target is the word rather than the
      // width of the screen beside it.
      alignSelf: 'flex-start',
      paddingVertical: space(1),
      paddingRight: space(6),
    },
    label: type.menu,
    long: type.menuLong,
  });
