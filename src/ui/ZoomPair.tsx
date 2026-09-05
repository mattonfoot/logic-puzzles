import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { joinLeft, radius, tint, type Palette } from './theme';

const OUT = '−';
const IN = '+';

interface Props {
  accent: string;
  /** Already as small as the board goes. */
  outDisabled: boolean;
  /** Already as large as a square gets. */
  inDisabled: boolean;
  onOut: () => void;
  onIn: () => void;
}

/**
 * − and +, sharing an edge, over the right-hand end of a board.
 *
 * A pair rather than two buttons that happen to be near each other: they do one
 * job in two directions, and a shared edge says so. Shared with the lesson
 * boards, which resize the same way for the same reason — a board is drawn to
 * fit the space it has, and a player who wants the squares bigger than that
 * should get them wherever they are.
 */
export function ZoomPair({ accent, outDisabled, inDisabled, onOut, onIn }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.pair}>
      <ZoomButton label={OUT} accent={accent} disabled={outDisabled} onPress={onOut} />
      <ZoomButton label={IN} joined accent={accent} disabled={inDisabled} onPress={onIn} />
    </View>
  );
}

function ZoomButton({
  label,
  accent,
  disabled,
  joined,
  onPress,
}: {
  label: string;
  accent: string;
  disabled: boolean;
  /** Share the left-hand edge with the button before it. */
  joined?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === IN ? t('game.zoomIn') : t('game.zoomOut')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        joined && joinLeft,
        {
          backgroundColor: palette.surface,
          borderColor: tint(accent, 0.4),
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    pair: {
      flexDirection: 'row',
    },
    button: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 17,
      fontWeight: '700',
      marginTop: -2,
    },
  });
