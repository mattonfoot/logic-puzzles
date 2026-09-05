import React from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, tint, type Palette } from '../ui/theme';
import { Popup } from './Popup';

interface Props {
  visible: boolean;
  /** The clue the step follows from, already written out. Not every step has one. */
  clue?: string | null;
  /** What to do about it. */
  instruction: string;
  /** What the last press of Clue found wrong, and how to put it right. */
  problem?: string | null;
  /** Whether there is still anything to come back and be checked. */
  waiting: boolean;
  onClose: () => void;
}

/**
 * A lesson's clue and what to do with it, in the window a puzzle's clue lives
 * in.
 *
 * The instructions used to sit above the board, in a band held open for them
 * whether or not there was anything in it, which is the shape nothing else in
 * the app has. A puzzle puts its clue in a window because a clue you cannot
 * finish reading is worse than no clue at all — and a lesson has a clue *and* a
 * paragraph about it, so it needs the room more, not less. Putting it here also
 * hands the whole board back to the board.
 *
 * The clue comes first and is set the way a puzzle sets it, so what a player
 * learns to look at here is the thing they will be looking at for the rest of
 * the game. Under it, in the app's quieter voice, is what to do about it, and
 * under that the one line that makes the lesson work at all: the way on is the
 * same button that opened this.
 *
 * When the last press of Clue found something wrong, that goes at the top in
 * the danger colour, above the clue it is about — the answer to a question the
 * player just asked, before the thing they asked it about.
 */
export function LessonPopup({ visible, clue, instruction, problem, waiting, onClose }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Popup visible={visible} onClose={onClose}>
      {problem ? (
        <View
          style={[
            styles.problem,
            { backgroundColor: tint(palette.danger, 0.1), borderColor: tint(palette.danger, 0.4) },
          ]}
        >
          <Text style={[styles.problemText, { color: palette.danger }]}>{problem}</Text>
        </View>
      ) : null}

      {clue ? (
        <>
          <Text style={[styles.opener, { color: palette.accent }]}>{t('lessons.clue')}</Text>
          <Text style={styles.clue} accessibilityLabel={t('clue.inPlay')}>
            {clue}
          </Text>
        </>
      ) : null}

      <Text style={[styles.opener, styles.saying, { color: palette.accent }]}>
        {t('lessons.saying')}
      </Text>
      <Text style={styles.instruction}>{instruction}</Text>

      {waiting ? <Text style={styles.again}>{t('lessons.whenDone')}</Text> : null}
    </Popup>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    problem: {
      borderWidth: 1,
      paddingVertical: space(3),
      paddingHorizontal: space(4),
      marginBottom: space(4),
    },
    problemText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
    },
    opener: {
      // The same label a puzzle's clue window wears over the same words.
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
    saying: {
      marginTop: space(4),
    },
    clue: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      color: palette.ink,
      marginTop: space(2),
    },
    instruction: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.ink,
      marginTop: space(2),
    },
    again: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: palette.inkSoft,
      marginTop: space(4),
    },
  });
