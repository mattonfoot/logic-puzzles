import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { inkOn, space, tint, type Palette } from './theme';

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
 * screen rather than the second. It is painted in `accentGround` rather than
 * `accent`: at night the accent is lightened so it can be read on a near-black
 * page, which leaves it too pale to carry white text, so the panel keeps the
 * daytime cut of the same colour in both schemes.
 *
 * The line above the name runs into it — "One solution, never guessed, pure…"
 * and then the word itself, which is what the app is called and what it asks of
 * you. Nothing sits under it: a paragraph explaining the game to somebody who
 * has already installed it is a paragraph nobody reads twice, and the two lines
 * that are left say it in six words.
 *
 * The words on it are white or the page's own ink, whichever reads better on
 * that ground. A deep navy takes white; a pale lilac cannot carry it, and gets
 * ink instead. The colour is the player's, so the panel asks rather than
 * assuming.
 */
export function TitlePanel() {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const ground = palette.accentGround;
  const on = inkOn(ground, '#FFFFFF', palette.ink);
  // The same ink held back, for the lines either side of the name.
  const onSoft = tint(on, 0.82);

  return (
    <View style={[styles.panel, { backgroundColor: ground, paddingTop: insets.top + space(4) }]}>
      <Text style={[styles.eyebrow, { color: onSoft }]}>One solution, never guessed, pure…</Text>
      <Text style={[styles.title, { color: on }]} numberOfLines={1} adjustsFontSizeToFit>
        Deduction
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
      fontWeight: '700',
    },
    title: {
      alignSelf: 'stretch',
      // As large as the word goes: nine letters at 80pt overrun a phone's width
      // before the margins, so the name is sized to fill the panel instead.
      fontSize: 64,
      lineHeight: 74,
      fontWeight: '800',
      marginTop: space(2),
      letterSpacing: -2,
    },
  });
