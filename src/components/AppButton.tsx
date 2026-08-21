import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { palette, radius, shadow, space, tint } from '../ui/theme';

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
  accent = palette.ink,
  icon,
  disabled = false,
  style,
}: Props) {
  const background =
    variant === 'primary' ? accent : variant === 'secondary' ? palette.surface : 'transparent';
  const color = variant === 'primary' ? '#FFFFFF' : accent;
  const border =
    variant === 'secondary' ? tint(accent, 0.35) : variant === 'ghost' ? 'transparent' : accent;

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

const styles = StyleSheet.create({
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
