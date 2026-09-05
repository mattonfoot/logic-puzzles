import React from 'react';
import { StyleSheet, View } from 'react-native';

import { clueOpener } from '../data/openers';
import { t } from '../i18n';
import { describeClue } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { Pager } from '../ui/Pager';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';
import { Popup } from './Popup';

interface Props {
  visible: boolean;
  puzzle: Puzzle;
  /** The clue on the table, or null before the first one is asked for. */
  index: number | null;
  /** Where this clue sits among the ones read, counting from one. */
  position: number;
  /** How many have been read. */
  total: number;
  previousDisabled: boolean;
  onPrevious: () => void;
  /** Steps to the next clue read, or asks for a new one at the end of them. */
  onNext: () => void;
  onClose: () => void;
}

/**
 * The clue on the table, in a window of its own.
 *
 * A clue used to live in a panel under the board, which meant it had a panel's
 * worth of room: three lines beside two buttons, and the longer ones — a
 * comparison naming two things by description rather than by name — ran out of
 * it. A clue you cannot finish reading is worse than no clue at all, so it gets
 * the middle of the screen and as many lines as it needs.
 *
 * **Previous** and **Next** move through the clues already read, and Next at
 * the end of them asks for a new one — which is the same press the Clue button
 * makes, and the same cost. Reading a clue is the one decision the game counts,
 * so it cannot be got round by walking forwards: going back through what you
 * have already been told is free, going on is not.
 *
 * Above the clue is who is supposed to have said it — "One diver remembered
 * that…" — which turns a bare fact into something people are talking about.
 * Which clue you are on goes between Previous and Next, where the item card
 * already keeps its count, so the top of the window is the puzzle's voice
 * rather than the app's bookkeeping.
 */
export function CluePopup({
  visible,
  puzzle,
  index,
  position,
  total,
  previousDisabled,
  onPrevious,
  onNext,
  onClose,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  if (!visible) return null;

  return (
    <Popup visible onClose={onClose}>
      <Text style={[styles.opener, { color: palette.accent }]}>
        {index === null ? t('clue.noneYet') : `${clueOpener(puzzle, index)}…`}
      </Text>

      <Text style={styles.clue} accessibilityLabel={t('clue.inPlay')}>
        {index === null ? t('clue.noneYetBody') : describeClue(puzzle.clues[index], puzzle)}
      </Text>

      <View style={styles.pager}>
        <Pager
          previousDisabled={previousDisabled}
          middle={index === null ? undefined : t('common.position', { at: position, total })}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </View>
    </Popup>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    opener: {
      // Spoken rather than filed: sentence case and a little larger than the
      // labels elsewhere, because it is the first half of what is being read
      // rather than a heading over it.
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
    clue: {
      // No line limit: the window is here so that the longest clue a puzzle can
      // write still reads to the end of itself.
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      color: palette.ink,
      marginTop: space(2),
    },
    pager: {
      marginTop: space(4),
    },
  });
