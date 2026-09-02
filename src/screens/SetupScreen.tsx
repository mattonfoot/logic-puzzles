import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SIZES } from '../data/sizes';
import { progress } from '../game/board';
import type { SavedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import { t } from '../i18n';
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
  /** There is one on the device, and it could not be read. */
  savedGameDamaged?: boolean;
  /** Picking a difficulty opens the numbered list of games at that shape. */
  onChoose: (size: SizeOption) => void;
  onResume: () => void;
  onBack: () => void;
}

/**
 * How big the grid is — the first of the two things a player chooses. The other
 * is which numbered game to play, on the screen a difficulty leads to, and
 * everything else about a puzzle falls out of that number: the theme, the cast,
 * the answer and the clues.
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
 * A game already in progress sits above the **Play** heading, as one word —
 * **Continue** — set the same size as the difficulties under it. It is not one
 * of them: they start something, it goes back to something, and standing above
 * the heading rather than at the top of its list says so without a word of
 * explanation. It is first because this is where a player comes when they want
 * to play something: leaving a puzzle lands here, and so does Play from the
 * front door. It carries no card of its own. How far in it was and what it was about
 * are answers to a question nobody asks on the way back to a game they left ten
 * minutes ago, and the board itself says both the moment it opens. They are
 * still read out as the link's hint, for a player who is being read the screen.
 *
 * There is nothing here for throwing that game away either: picking any
 * difficulty replaces it, which is the same decision made by choosing what to
 * do instead of what to stop.
 */
export function SetupScreen({
  busy,
  savedGame,
  savedGameDamaged = false,
  onChoose,
  onResume,
  onBack,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {savedGame ? (
            <View style={styles.waiting}>
              <Choice
                label={t('setup.continue')}
                hint={t('setup.continueHint', {
                  theme: savedGame.puzzle.themeName,
                  size: savedGame.puzzle.size.label,
                  percent: Math.round(progress(savedGame.marks, savedGame.puzzle) * 100),
                  clock: formatDuration(savedGame.seconds),
                })}
                disabled={busy}
                onPress={onResume}
              />
            </View>
          ) : savedGameDamaged ? (
            // Where Continue would be: the one place a player looking for their
            // game will look, and the one thing to be said about it.
            <Text style={styles.notice}>{t('setup.unreadable')}</Text>
          ) : null}

          <RuledTitle>{t('setup.title')}</RuledTitle>

          <View style={styles.choices}>
            {SIZES.map((option) => (
              <Choice
                key={option.id}
                label={option.difficulty}
                hint={t('setup.difficultyHint', {
                  items: option.items,
                  sets: option.categories,
                })}
                disabled={busy}
                onPress={() => onChoose(option)}
              />
            ))}
          </View>
        </ScrollView>

        <BackLink label={t('setup.back')} onPress={onBack} />
      </View>

      {busy ? (
        // The generator runs on the JS thread; ActivityIndicator animates
        // natively, so it keeps spinning while the puzzle is being built.
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.busyText}>{t('common.building')}</Text>
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
    notice: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.danger,
      textAlign: 'center',
      paddingHorizontal: space(4),
      marginBottom: space(4),
    },
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
      paddingBottom: space(5),
    },
    waiting: {
      marginBottom: space(4),
    },
    choices: {
      marginTop: space(3),
    },
    choice: {
      alignSelf: 'flex-start',
      paddingVertical: space(0.75),
      paddingRight: space(6),
    },
    choiceText: {
      // Sized so the whole list — Continue and the four difficulties — stands
      // in the half of the screen the panel leaves, on the phone this is drawn
      // for. A word that has to be scrolled to is a word that might as well not
      // be on the screen.
      fontSize: 33,
      lineHeight: 40,
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
