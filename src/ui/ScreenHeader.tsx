import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useStyles } from './ThemeProvider';
import { border, space, type Palette } from './theme';

interface Props {
  title: string;
  /** Second line, for whatever the screen is about. */
  subtitle?: string;
  /** The glyph in the button: an arrow to go back, a cross to close. */
  icon?: string;
  label?: string;
  onBack: () => void;
}

/** The bar every screen but the board and the start page wears. */
export function ScreenHeader({ title, subtitle, icon = '‹', label = 'Back', onBack }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + space(2) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onBack}
        style={styles.button}
        hitSlop={12}
      >
        <Text style={styles.buttonText}>{icon}</Text>
      </Pressable>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space(4),
      paddingBottom: space(3),
      gap: space(3),
      borderBottomWidth: border,
      borderBottomColor: palette.line,
    },
    button: {
      width: 34,
      height: 34,
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 18,
      lineHeight: 22,
      color: palette.ink,
      marginTop: -2,
    },
    text: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.ink,
    },
    subtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: 1,
    },
  });
