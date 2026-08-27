import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useStyles } from './ThemeProvider';
import { border, space, type Palette } from './theme';

interface Props {
  title: string;
  /** Second line, for whatever the screen is about. */
  subtitle?: string;
}

/**
 * A bar naming the screen, with nothing to press: the way back is `BackLink`,
 * at the foot of the screen, which is where it is everywhere else too.
 *
 * The statistics screen is the last one wearing it. The setup and settings
 * screens use `RuledTitle` instead, which sits in the scroll rather than above
 * it.
 */
export function ScreenHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + space(2) }]}>
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
