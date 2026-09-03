import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { useStyles } from './ThemeProvider';
import { space, TITLE_GAP, type, type Palette } from './theme';

interface Props {
  children: string;
  style?: ViewStyle;
}

/**
 * What a screen is, with a rule drawn out of the word.
 *
 * The line leaves the right-hand side of the title at the height of its middle,
 * in the same ink, and stops short of the margin — so it belongs to the heading
 * rather than fencing off whatever comes under it, which is what a full-width
 * hairline underneath ends up doing.
 */
export function RuledTitle({ children, style }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header">
        {children}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      // Carried by the title rather than left to each screen, which is how the
      // gap under it came to be three different sizes.
      marginBottom: TITLE_GAP,
    },
    title: {
      ...type.title,
      color: palette.ink,
    },
    line: {
      flex: 1,
      height: 2,
      backgroundColor: palette.ink,
      marginRight: space(4),
    },
  });
