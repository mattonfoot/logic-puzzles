import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { dayPalette, space, type Palette } from './theme';

/** White on the panel, and the same white held back for the lines around the name. */
const ON_PANEL = '#FFFFFF';
const ON_PANEL_SOFT = 'rgba(255, 255, 255, 0.82)';

/**
 * The app's name on a block of the link colour: the top half of every screen
 * the player passes through before a puzzle starts.
 *
 * The words live here rather than being passed in, and so does its height: the
 * point of it is that the front door and the setup screen show the *same*
 * panel, so going from one to the other changes the bottom half of the screen
 * and nothing else. It is the top half exactly — a flex basis rather than a
 * share of what is left over, because two screens whose lower halves are padded
 * differently would otherwise split a few points apart and the name would jump
 * on the way through.
 *
 * It runs up behind the status bar, so the name is the first thing on the
 * screen rather than the second. At night the accent is a pale lavender that
 * white cannot be read on, so the panel keeps the day cut of the same blue in
 * both palettes — the links below it still take the accent the rest of the app
 * is using.
 */
export function TitlePanel() {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const ground = palette.scheme === 'night' ? dayPalette.accent : palette.accent;

  return (
    <View style={[styles.panel, { backgroundColor: ground, paddingTop: insets.top + space(4) }]}>
      <Text style={styles.eyebrow}>Freshly generated, never guessed</Text>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Deduction
      </Text>
      <Text style={styles.lede}>
        Every puzzle is built when you ask for it, with exactly one solution you can reach by pure
        deduction — no guessing.
      </Text>
    </View>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    panel: {
      // The top half, to the pixel.
      flexBasis: '50%',
      flexGrow: 0,
      flexShrink: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: space(5),
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
    lede: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
      color: ON_PANEL_SOFT,
      marginTop: space(3),
    },
  });
