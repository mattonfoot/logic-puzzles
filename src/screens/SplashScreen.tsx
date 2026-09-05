import React from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { inkOn, space, tint, type Palette } from '../ui/theme';

interface Props {
  /**
   * Whether the words can be drawn yet.
   *
   * The name is set in the app's own face, and until it has loaded any text
   * drawn here comes out in whatever the system happens to have and swaps the
   * moment the real one arrives. The colour is right from the first frame
   * either way, and the native splash behind this one is already showing the
   * same words in the right face, so the honest thing is to hold them back
   * rather than flash a different typeface over the top of them.
   */
  words: boolean;
}

/**
 * What the app is, on the colour it is drawn in, while it gets ready.
 *
 * The screen was blank here — the right colour and nothing on it — because the
 * fonts and the player's settings both have to be read before a front door can
 * be drawn, and a half-drawn one is worse than none. That is a second or less
 * on any device, but it is the second the app opens on, and it was saying
 * nothing.
 *
 * It is painted in `accentGround`, which is the colour the player chose — the
 * same block the title panel wears on every screen before a board, so the app
 * opens in its own colour and stays in it. `accentGround` is the accent's
 * daytime cut in both schemes, so this is the same picture at midnight.
 *
 * The words are white, or the page's own ink if a colour ever arrives that
 * cannot carry white. All five can, comfortably — the closest is the green at
 * 4.07 to 1 — so in practice this is white, and it asks rather than assuming
 * because the alternative is unreadable text on a colour nobody has picked yet.
 *
 * There is no board on it, and no icon. The icon is the board already, it is on
 * the home screen the player just pressed, and a second copy of it here would be
 * showing somebody what they were looking at a moment ago instead of telling
 * them what they have opened.
 */
export function SplashScreen({ words }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const on = inkOn(palette.accentGround, '#FFFFFF', palette.ink);

  return (
    <View style={[styles.screen, { backgroundColor: palette.accentGround }]}>
      {words ? (
        <View style={styles.words}>
          <Text style={[styles.name, { color: on }]} numberOfLines={1} adjustsFontSizeToFit>
            {t('splash.name')}
          </Text>
          {/* The same ink held back, the way the panel holds its tagline back:
              whose game it is, said once, quietly, under the name. */}
          <Text style={[styles.byline, { color: tint(on, 0.82) }]}>{t('splash.byline')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (_palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    words: {
      alignItems: 'center',
      paddingHorizontal: space(5),
    },
    name: {
      // Larger than the panel's 62, and it can be: that one carries a leading
      // ellipsis and shares its half of the screen with two doors, and this has
      // the whole page. Nine letters at this size measure 290 points against
      // the 335 a 375-point phone leaves between the margins, which is room to
      // spare rather than a fit — 72 came to 329 and cleared it by six.
      fontSize: 64,
      lineHeight: 76,
      fontWeight: '800',
      letterSpacing: -2,
      textAlign: 'center',
    },
    byline: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      letterSpacing: 0.3,
      textAlign: 'center',
      marginTop: space(2),
    },
  });
