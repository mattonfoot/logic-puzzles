import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { feedback } from '../ui/feedback';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';
import { TitlePanel } from '../ui/TitlePanel';

interface Props {
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

/**
 * The front door: what the app is, and the one thing to do about it.
 *
 * The screen is halved. The top half is the name and what it is, sitting in the
 * middle of it with nothing to press — a page to land on. The bottom half is
 * where the pressing happens, and **Play** sits at the top of it, roughly under
 * the thumb, where the eye arrives after reading.
 *
 * The top half is `TitlePanel` — the same block of the link colour the setup
 * screen wears, given the whole half here because this is the one screen with
 * room for it.
 *
 * Everything hangs off the same left margin — eyebrow, name, description, Play
 * — so the eye drops straight down one edge. The single exception is
 * Statistics, which is pushed to the right so the two links at the foot sit in
 * opposite corners rather than reading as a pair.
 *
 * Those two are text rather than anything with a box round it. They are
 * somewhere to go once, not the point of the page, and putting them in a row of
 * cards with Play made all three look like the same size of decision.
 */
export function StartScreen({ onPlay, onOpenSettings, onOpenStats }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <TitlePanel
        size="hero"
        style={styles.top}
        eyebrow="Freshly generated, never guessed"
        lede="Every puzzle is built when you ask for it, with exactly one solution you can reach by pure deduction — no guessing."
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space(3) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play"
          onPress={() => {
            feedback.tap();
            onPlay();
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.play, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.playText, { color: palette.accent }]}>Play</Text>
        </Pressable>

        <View style={styles.footer}>
          <FootLink label="Settings" onPress={onOpenSettings} />
          <FootLink label="Statistics" onPress={onOpenStats} />
        </View>
      </View>
    </View>
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
    // Two equal halves: what the app is, then what to do about it.
    top: {
      flex: 1,
    },
    bottom: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: space(5),
    },
    play: {
      alignSelf: 'flex-start',
      paddingTop: space(6),
      paddingRight: space(8),
      paddingBottom: space(2),
    },
    playText: {
      fontSize: 56,
      lineHeight: 64,
      fontWeight: '800',
      letterSpacing: -1,
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
