import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { feedback } from './feedback';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { space, type Palette } from './theme';

interface Props {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  /** Sits between the two, for a "3 of 8" or a hint about where you are. */
  middle?: string;
}

/**
 * **Previous** and **Next**, at the two ends of a line.
 *
 * Three things in the app are a position in a run — the page of numbered
 * puzzles, the items in a set, the clues you have read — and all three move
 * with the same pair of words in the same two corners, so moving through one
 * teaches the other two.
 *
 * A link that has nowhere to go is drawn held back rather than taken away: a
 * row that changes shape as you move through it is a row you have to find
 * again each time.
 */
export function Pager({ onPrevious, onNext, previousDisabled, nextDisabled, middle }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <PageLink
        label={t('common.previous')}
        disabled={Boolean(previousDisabled)}
        onPress={onPrevious}
      />
      {middle ? <Text style={styles.middle}>{middle}</Text> : null}
      <PageLink label={t('common.next')} disabled={Boolean(nextDisabled)} onPress={onNext} />
    </View>
  );
}

function PageLink({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.link, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.text, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    link: {
      paddingVertical: space(2),
    },
    text: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    middle: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.inkFaint,
    },
  });
