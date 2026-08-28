import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SIZES } from '../data/sizes';
import { progress } from '../game/board';
import type { SavedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { TitlePanel } from '../ui/TitlePanel';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  busy: boolean;
  /** An unfinished game waiting to be picked back up, if there is one. */
  savedGame: SavedGame | null;
  /** Picking a difficulty is starting the puzzle; there is nothing else to say. */
  onStart: (size: SizeOption) => void;
  onSurpriseMe: () => void;
  onResume: () => void;
  onBack: () => void;
}

/**
 * What to play: how big the grid is, which is the only thing about a puzzle the
 * player chooses. Everything else — the theme, the cast, the answer — is drawn
 * when the game starts.
 *
 * It is the front door with its bottom half swapped: the same panel, given the
 * same half of the screen, and under it the difficulties set as a list of words
 * in the accent the same way **Play** is set on the front door. Choosing one is
 * the same size of decision as pressing Play was, so it is drawn the same size.
 * What each shape means is on the board a second later, and was never the thing
 * being chosen.
 *
 * That leaves half a screen for five names and whatever game is waiting, so the
 * bottom half scrolls. The way back sits under it rather than inside it.
 *
 * A game already in progress is the first of them — **Continue**, in the same
 * words as the rest — because this is where a player comes when they want to
 * play something: leaving a puzzle lands here, and so does Play from the front
 * door. It carries no card of its own. How far in it was and what it was about
 * are answers to a question nobody asks on the way back to a game they left ten
 * minutes ago, and the board itself says both the moment it opens. They are
 * still read out as the link's hint, for a player who is being read the screen.
 *
 * There is nothing here for throwing that game away either: picking any
 * difficulty replaces it, which is the same decision made by choosing what to
 * do instead of what to stop.
 */
export function SetupScreen({ busy, savedGame, onStart, onSurpriseMe, onResume, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <RuledTitle>Play</RuledTitle>

          <View style={styles.choices}>
            {savedGame ? (
              <Choice
                label="Continue"
                hint={`${savedGame.puzzle.themeName}, ${savedGame.puzzle.size.label}, ${Math.round(
                  progress(savedGame.marks, savedGame.puzzle) * 100,
                )}% filled in, ${formatDuration(savedGame.seconds)} on the clock`}
                disabled={busy}
                onPress={onResume}
              />
            ) : null}
            {SIZES.map((option) => (
              <Choice
                key={option.id}
                label={option.difficulty}
                hint={`${option.items} items in each of ${option.categories} sets`}
                disabled={busy}
                onPress={() => onStart(option)}
              />
            ))}
            <Choice
              label="Surprise me!"
              hint="Any of the four, rolled for you"
              disabled={busy}
              onPress={onSurpriseMe}
            />
          </View>
        </ScrollView>

        <BackLink label="Back" onPress={onBack} />
      </View>

      {busy ? (
        // The generator runs on the JS thread; ActivityIndicator animates
        // natively, so it keeps spinning while the puzzle is being built.
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.busyText}>Building your puzzle…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * One difficulty, as a word. The shape it stands for rides along as a hint, so
 * a screen reader still hears what is being chosen without it being set on the
 * page next to the name.
 */
function Choice({
  label,
  hint,
  disabled,
  onPress,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.choice, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.choiceText, { color: palette.accent }]}>{label}</Text>
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
    },
    content: {
      paddingHorizontal: space(5),
      paddingTop: space(5),
      paddingBottom: space(6),
    },
    choices: {
      marginTop: space(4),
    },
    choice: {
      alignSelf: 'flex-start',
      paddingVertical: space(1),
      paddingRight: space(6),
    },
    choiceText: {
      fontSize: 38,
      lineHeight: 48,
      fontWeight: '800',
      letterSpacing: -1,
    },
    busyOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: tint(palette.bg, 0.72),
      alignItems: 'center',
      justifyContent: 'center',
    },
    busyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      paddingVertical: space(3),
      paddingHorizontal: space(5),
    },
    busyText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.ink,
    },
  });
