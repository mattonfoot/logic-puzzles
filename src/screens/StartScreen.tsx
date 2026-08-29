import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { feedback } from '../ui/feedback';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';
import { TitlePanel } from '../ui/TitlePanel';

interface Props {
  onDaily: () => void;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

/**
 * The front door: what the app is, and the one thing to do about it.
 *
 * The screen is halved. The top half is the name and what it is, sitting in the
 * middle of it with nothing to press — a page to land on. The bottom half is
 * where the pressing happens: **Daily** and then **Play**, at the top of it,
 * roughly under the thumb, where the eye arrives after reading.
 *
 * Daily leads, because it is the one that expires. Play is there every day and
 * will keep; today's four challenges will not. A rule between them says they
 * are two different offers rather than a list of two — one is what to play
 * today, the other is everything else.
 *
 * The top half is `TitlePanel`, the same block of the link colour the setup
 * screen wears: stepping from here to there changes the bottom half of the
 * screen and nothing else.
 *
 * Everything hangs off the same left margin — the panel's words and both doors
 * — so the eye drops straight down one edge. The single exception is
 * Statistics, which is pushed to the right so the two links at the foot sit in
 * opposite corners rather than reading as a pair.
 *
 * Those two are text rather than anything with a box round it. They are
 * somewhere to go once, not the point of the page, and putting them in a row of
 * cards with the two doors made them all look like the same size of decision.
 */
export function StartScreen({ onDaily, onPlay, onOpenSettings, onOpenStats }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space(3) }]}>
        <View style={styles.doors}>
          <Door label="Daily" onPress={onDaily} />
          <View style={styles.rule} />
          <Door label="Play" onPress={onPlay} />
        </View>

        <View style={styles.footer}>
          <FootLink label="Settings" onPress={onOpenSettings} />
          <FootLink label="Statistics" onPress={onOpenStats} />
        </View>
      </View>
    </View>
  );
}

/** One of the two ways in, set as large as the app sets anything. */
function Door({ label, onPress }: { label: string; onPress: () => void }) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      hitSlop={12}
      style={({ pressed }) => [styles.door, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.doorText, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

function FootLink({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.footLink, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={styles.footText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    // The panel is the top half; this is the other one.
    bottom: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: space(5),
    },
    doors: {
      paddingTop: space(5),
    },
    door: {
      alignSelf: 'flex-start',
      paddingVertical: space(1),
      paddingRight: space(8),
    },
    doorText: {
      fontSize: 56,
      lineHeight: 64,
      fontWeight: '800',
      letterSpacing: -1,
    },
    rule: {
      // Between the two, not under both: it separates rather than underlines,
      // so it stops short of the right-hand edge the way the ruled titles do.
      height: 2,
      backgroundColor: palette.line,
      marginVertical: space(2),
      marginRight: space(4),
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    footLink: {
      paddingVertical: space(2),
    },
    footText: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.3,
      color: palette.inkSoft,
    },
  });
