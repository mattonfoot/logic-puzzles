import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { describeClue } from '../puzzle/describe';
import type { Puzzle } from '../puzzle/types';
import { feedback } from '../ui/feedback';
import { Pager } from '../ui/Pager';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, type Palette } from '../ui/theme';

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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.backdrop}
        onPress={() => {
          feedback.tap();
          onClose();
        }}
      >
        {/* Taps inside the window stay inside it. */}
        <Pressable style={[styles.card, shadow.raised]} onPress={() => undefined}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            {index === null ? 'No clue yet' : `Clue ${position} of ${total}`}
          </Text>

          <Text style={styles.clue} accessibilityLabel="Clue in play">
            {index === null
              ? 'Tap Next for the first clue.'
              : describeClue(puzzle.clues[index], puzzle)}
          </Text>

          <View style={styles.pager}>
            <Pager previousDisabled={previousDisabled} onPrevious={onPrevious} onNext={onNext} />
          </View>

          <Text style={styles.dismiss}>Tap outside to close</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(24, 22, 18, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: space(6),
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      padding: space(5),
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    clue: {
      // No line limit: the window is here so that the longest clue a puzzle can
      // write still reads to the end of itself.
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      color: palette.ink,
      marginTop: space(3),
    },
    pager: {
      marginTop: space(4),
    },
    dismiss: {
      fontSize: 11,
      color: palette.inkFaint,
      textAlign: 'center',
      marginTop: space(2),
    },
  });
