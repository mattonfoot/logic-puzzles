import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

interface Props {
  title: string;
  /** One line of grey under the title: which one of them this is. */
  subtitle: string;
  /** Anything that stands in the left margin, beside the title. */
  left?: ReactNode;
}

/** The title over a board, in a game and in a lesson alike. */
export function BoardHeader({ title, subtitle, left }: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space(4) }]}>
      {left}
      <View style={styles.center}>
        <RuledTitle>{title}</RuledTitle>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      // Anything in the margin sits with the title rather than with the line
      // under it.
      alignItems: 'flex-start',
      paddingHorizontal: space(4),
      paddingBottom: space(3),
      gap: space(3),
    },
    center: {
      flex: 1,
    },
    subtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(1.5),
    },
  });
