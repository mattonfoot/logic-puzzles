import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { dayPalette, space, type Palette } from './theme';

interface Props {
  /** Small line above the name. */
  eyebrow?: string;
  /** A paragraph under it, on the screen that has room for one. */
  lede?: string;
  /** How large the name is drawn: the front door gives it the most room. */
  size?: 'hero' | 'compact';
  style?: ViewStyle;
}

/** White on the panel, and the same white held back for the lines around the name. */
const ON_PANEL = '#FFFFFF';
const ON_PANEL_SOFT = 'rgba(255, 255, 255, 0.82)';

/**
 * The app's name on a block of the link colour, which is how every screen the
 * player passes through before a puzzle starts opens.
 *
 * It runs up behind the status bar, so the name is the first thing on the
 * screen rather than the second. At night the accent is a pale lavender that
 * white cannot be read on, so the panel keeps the day cut of the same blue in
 * both palettes — the links below it still take the accent the rest of the app
 * is using.
 */
export function TitlePanel({ eyebrow, lede, size = 'compact', style }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const ground = palette.scheme === 'night' ? dayPalette.accent : palette.accent;

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: ground, paddingTop: insets.top + space(4) },
        size === 'compact' && styles.panelCompact,
        style,
      ]}
    >
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text
        style={[styles.title, size === 'compact' && styles.titleCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        Deduction
      </Text>
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
    </View>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    panel: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: space(5),
    },
    panelCompact: {
      paddingBottom: space(4),
    },
    eyebrow: {
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: ON_PANEL_SOFT,
      fontWeight: '700',
    },
    title: {
      alignSelf: 'stretch',
      // As large as the word goes: nine letters at 80pt overrun a phone's width
      // before the margins, so the name is sized to fill the panel instead.
      fontSize: 64,
      lineHeight: 74,
      fontWeight: '800',
      color: ON_PANEL,
      marginTop: space(2),
      letterSpacing: -2,
    },
    titleCompact: {
      fontSize: 38,
      lineHeight: 46,
      marginTop: 0,
      letterSpacing: -1,
    },
    lede: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
      color: ON_PANEL_SOFT,
      marginTop: space(3),
    },
  });
