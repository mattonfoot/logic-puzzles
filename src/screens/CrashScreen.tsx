import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { t } from '../i18n';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

interface Props {
  error: Error;
  onHome: () => void;
  onDiscard: () => void;
}

/**
 * What the app shows instead of a white page.
 *
 * A throw while a screen is drawing unmounts everything above it, and without
 * this that is the end: a blank page, no button, and on a phone nothing to do
 * but force-quit — after which, if the state that threw was read back from
 * disk, it throws again on the way in. So the page is two ways on rather than
 * an apology. **Back to the start** puts the app back at the front door with
 * everything kept, for the throw that will not happen twice. **Discard the
 * saved game** does the same with the game in progress thrown away, for the
 * one that will: a save the board cannot open is the failure most likely to
 * repeat, and the only one the player can do anything about.
 *
 * Finished games are never touched from here. The history is what the player
 * has to show for the app, and no crash is worth it.
 *
 * The message is printed small under the buttons. It is not for the player;
 * it is what they can read out, or photograph, when reporting the bug.
 */
export function CrashScreen({ error, onHome, onDiscard }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space(8), paddingBottom: insets.bottom + space(6) },
      ]}
    >
      <RuledTitle>{t('crash.title')}</RuledTitle>
      <Text style={styles.body}>{t('crash.body')}</Text>

      <View style={styles.actions}>
        <AppButton label={t('crash.home')} accent={palette.accent} onPress={onHome} />
        <AppButton label={t('crash.discard')} variant="secondary" onPress={onDiscard} />
      </View>

      <Text style={styles.detail} selectable>
        {t('crash.detail', { message: error.message || String(error) })}
      </Text>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
      paddingHorizontal: space(6),
      justifyContent: 'center',
      gap: space(5),
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.inkSoft,
      textAlign: 'center',
    },
    actions: {
      gap: space(3),
      marginTop: space(2),
    },
    detail: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.inkFaint,
      textAlign: 'center',
      marginTop: space(2),
    },
  });
