import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SIZES } from '../data/sizes';
import { progress } from '../game/board';
import type { SavedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
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
  onDiscardSaved: () => void;
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
 * The game already in progress sits above them, because this is where a player
 * comes when they want to play something: leaving a puzzle lands here, and so
 * does Play from the front door.
 */
export function SetupScreen({
  busy,
  savedGame,
  onStart,
  onSurpriseMe,
  onResume,
  onDiscardSaved,
  onBack,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const savedProgress = savedGame ? progress(savedGame.marks, savedGame.puzzle) : 0;

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {savedGame ? (
            <View
              style={[
                styles.resumeCard,
                shadow.card,
                {
                  borderColor: palette.accent,
                  backgroundColor: tint(palette.accent, 0.08),
                },
              ]}
            >
              <Text style={styles.resumeLabel}>Puzzle in progress</Text>
              <View style={styles.resumeTitleRow}>
                <Icon name={savedGame.puzzle.themeIcon} size={20} color={palette.accent} />
                <Text style={styles.resumeTitle}>
                  {savedGame.puzzle.themeName} · {savedGame.puzzle.size.label}
                </Text>
              </View>
              <Text style={styles.resumeMeta}>
                {Math.round(savedProgress * 100)}% filled in · {formatDuration(savedGame.seconds)}{' '}
                on the clock
              </Text>
              <View style={styles.resumeButtons}>
                <AppButton
                  label="Resume"
                  icon="▶"
                  accent={palette.accent}
                  onPress={onResume}
                  style={styles.resumeButton}
                />
                <AppButton
                  label="Discard"
                  variant="ghost"
                  accent={palette.inkSoft}
                  onPress={() => setConfirmingDiscard(true)}
                  style={styles.resumeButton}
                />
              </View>
            </View>
          ) : null}

          <RuledTitle>Play</RuledTitle>

          <View style={styles.choices}>
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

      <ConfirmDialog
        visible={confirmingDiscard}
        title="Discard the saved puzzle?"
        message="Your progress on it will be lost."
        confirmLabel="Discard it"
        onConfirm={() => {
          setConfirmingDiscard(false);
          onDiscardSaved();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      />

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
    resumeCard: {
      borderWidth: border,
      padding: space(4),
      marginBottom: space(6),
    },
    resumeLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
    },
    resumeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      marginTop: space(1.5),
    },
    resumeTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.ink,
    },
    resumeMeta: {
      fontSize: 13,
      color: palette.inkSoft,
      marginTop: space(1),
    },
    resumeButtons: {
      flexDirection: 'row',
      gap: space(2),
      marginTop: space(3),
    },
    resumeButton: {
      flex: 1,
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
