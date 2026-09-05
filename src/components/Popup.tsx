import React, { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { t } from '../i18n';
import { feedback } from '../ui/feedback';
import { Text } from '../ui/Text';
import { useStyles } from '../ui/ThemeProvider';
import { border, shadow, space, type Palette } from '../ui/theme';

interface Props {
  visible: boolean;
  children: ReactNode;
  onClose: () => void;
}

/**
 * A window over the board: the shell every one of them is.
 *
 * The briefing, the clue and a lesson's instructions are three different things
 * to read and one thing to look at — a card in the middle of a dimmed screen,
 * dismissed by tapping the dark part, with a line at the foot saying so. The
 * card was written out three times before this, which is three chances for one
 * of them to end up a few points wider than the others, and a lesson that
 * looked *nearly* like the game it is teaching would be worse than one that
 * looked nothing like it.
 *
 * The backdrop is a button called Close, so the whole dimmed area is one big
 * dismiss for a finger and one item for a screen reader. Taps inside the card
 * stop there.
 */
export function Popup({ visible, children, onClose }: Props) {
  const styles = useStyles(makeStyles);
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={styles.backdrop}
        onPress={() => {
          feedback.tap();
          onClose();
        }}
      >
        {/* Taps inside the window stay inside it. */}
        <Pressable style={[styles.card, shadow.raised]} onPress={() => undefined}>
          {children}
          <Text style={styles.dismiss}>{t('common.tapOutside')}</Text>
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
    dismiss: {
      fontSize: 11,
      color: palette.inkFaint,
      textAlign: 'center',
      marginTop: space(2),
    },
  });
