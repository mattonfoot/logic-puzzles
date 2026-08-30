import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { feedback } from './feedback';
import { Icon } from './Icon';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { space, type Palette } from './theme';

interface Props {
  /** What a screen reader says it goes back to, e.g. "Back to setup". */
  label?: string;
  onPress: () => void;
}

/**
 * The way back, and the only one.
 *
 * Every screen but the start page ends with this in the bottom left, in the
 * same words and the same place, so going back is one thing the player learns
 * once. The top left is left to the board's menu button: a corner that
 * sometimes goes back and sometimes opens something is a corner nobody trusts.
 *
 * The triangle is one of the app's own silhouettes rather than a typed glyph,
 * so it is solid and the same shape on every platform.
 *
 * It carries the bottom safe area, so it is the last thing on a screen — the
 * scrolling part above it does not need to leave room for the home indicator.
 */
export function BackLink({ label, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + space(2) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? t('common.back')}
        hitSlop={12}
        onPress={() => {
          feedback.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="ui/icon-back" size={11} color={palette.inkSoft} />
        <Text style={styles.text}>{t('common.back')}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space(4),
      paddingTop: space(2),
    },
    hit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      paddingVertical: space(1),
      paddingRight: space(4),
    },
    text: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.3,
      color: palette.inkSoft,
    },
  });
