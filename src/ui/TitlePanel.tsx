import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { inkOn, space, tint, type Palette } from './theme';

/**
 * The app's name on a block of the link colour: the top half of every screen
 * the player passes through before a puzzle starts.
 *
 * The words live here rather than being passed in, and so does its height: the
 * point of it is that the front door, the difficulties, the numbered games and
 * the daily challenges show the *same* panel, so walking through them changes
 * the bottom half of the screen four times and never the top. It is the top half exactly — a flex basis rather than a
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
 * and then "…Deduction", the word picking the sentence back up where the line
 * above dropped it. It is what the app is called and what it asks of you. Nothing sits under it: a paragraph explaining the game to somebody who
 * has already installed it is a paragraph nobody reads twice, and the two lines
 * that are left say it in six words.
 *
 * The words on it are white or the page's own ink, whichever reads better on
 * that ground. A deep navy takes white; a pale lilac cannot carry it, and gets
 * ink instead. The colour is the player's, so the panel asks rather than
 * assuming.
 */
/**
 * What the busiest screen under this panel has to have.
 *
 * The numbered list decides it: a heading, six numbered rows, the pager and the
 * way back come to 386 points measured, and this is that plus 46 of room. The
 * room is not slack. A device loses 34 points of it to the home indicator under
 * the back link, which the browser the measurement came from does not report,
 * so a figure that merely cleared 386 there would scroll on the phone it was
 * measured for — which is exactly what an iPhone 11 Pro was doing. What is left
 * over after the indicator is the margin for a device whose text metrics are
 * not Chromium's.
 *
 * The other three screens that wear the panel want less, and get the same panel
 * anyway: what makes the panel the panel is that stepping between those screens
 * changes the bottom half and never the top.
 *
 * `npm run sizes` is what holds this honest, and would have caught it being 16
 * points short.
 */
const NEEDED_BELOW = 432;

/**
 * The panel never gets smaller than the words on it. No iPhone is short enough
 * to reach this; it is here so that one could not push the name off the top.
 */
const FLOOR = 200;

/**
 * How tall the panel is: half the screen, or whatever leaves the list below it
 * room to stand, whichever is less.
 *
 * It was exactly half, which is the shape the design is written around — and on
 * a tall phone it still is. On a short one half was too generous: an iPhone 11
 * Pro gives 406 points to each half, the six numbered puzzles and everything
 * around them want 402, and the 34 points of home-indicator inset under the
 * back link took the difference and more, so the list scrolled. A panel is
 * decoration and a list of puzzles is the thing the player came for, so the
 * decoration is what gives way.
 *
 * The answer depends on nothing but the window and the inset, so every screen
 * wearing the panel on a given phone gets the same one, which is the whole
 * point of it.
 */
export function panelHeight(windowHeight: number, bottomInset: number): number {
  const half = windowHeight / 2;
  const spare = windowHeight - NEEDED_BELOW - bottomInset;
  return Math.max(FLOOR, Math.min(half, spare));
}

export function TitlePanel() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const ground = palette.accentGround;
  const on = inkOn(ground, '#FFFFFF', palette.ink);
  // The same ink held back, for the lines either side of the name.
  const onSoft = tint(on, 0.82);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: ground,
          height: panelHeight(height, insets.bottom),
          paddingTop: insets.top + space(4),
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: onSoft }]}>{t('app.tagline')}</Text>
      <Text style={[styles.title, { color: on }]} numberOfLines={1} adjustsFontSizeToFit>
        {t('app.name')}
      </Text>
    </View>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    panel: {
      // Half the screen, or less where the list below needs it — the height is
      // worked out per device and set inline.
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
      // As large as the words go. Nine letters and a leading ellipsis at 64pt
      // measure 344 points, which is nine more than a 375-point phone leaves
      // between the margins; at 62 they fit every iPhone still supported
      // outright, rather than leaning on `adjustsFontSizeToFit` to save them.
      fontSize: 62,
      lineHeight: 74,
      fontWeight: '800',
      marginTop: space(2),
      letterSpacing: -2,
    },
  });
