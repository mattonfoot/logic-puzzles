import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { inkOn, radius, shadow, space, tint, type Palette } from '../ui/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  accent?: string;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  accent,
  icon,
  disabled = false,
  style,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  // The default is a colour, and colours now depend on the scheme, so it is
  // resolved here rather than in the signature.
  const tone = accent ?? palette.ink;
  const background =
    variant === 'primary' ? tone : variant === 'secondary' ? palette.surface : 'transparent';
  // A solid button is painted in the accent, and the accent is the player's:
  // whether its label reads better in the surface or in the ink depends on
  // which colour they picked.
  const color = variant === 'primary' ? inkOn(tone, palette.surface, palette.ink) : tone;
  const border =
    variant === 'secondary' ? tint(tone, 0.35) : variant === 'ghost' ? 'transparent' : tone;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && shadow.card,
        {
          backgroundColor: background,
          borderColor: border,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Text style={[styles.icon, { color }]}>{icon}</Text> : null}
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    button: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingVertical: space(3.5),
      paddingHorizontal: space(5),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(2),
    },
    icon: {
      fontSize: 15,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });
