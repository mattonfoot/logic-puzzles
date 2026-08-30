import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { radius, shadow, space, type Palette } from '../ui/theme';
import { AppButton } from './AppButton';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The app's one window: a title, what is at stake, and the two ways out of it.
 * It asks before anything destructive — discarding a saved game, clearing the
 * statistics, restarting a board — and carries the one report worth stopping
 * the game for, a board the answer can no longer be reached from.
 *
 * Written as a component rather than `Alert.alert` so it behaves the same
 * everywhere the app runs.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadow.raised]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <AppButton
            label={confirmLabel}
            accent={palette.danger}
            onPress={onConfirm}
            style={styles.button}
          />
          <AppButton
            label={cancelLabel ?? t('common.keepIt')}
            variant="ghost"
            accent={palette.inkSoft}
            onPress={onCancel}
            style={styles.button}
          />
        </View>
      </View>
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
      borderRadius: radius.lg,
      padding: space(6),
    },
    title: {
      fontSize: 19,
      fontWeight: '700',
      color: palette.ink,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.inkSoft,
      textAlign: 'center',
      marginTop: space(2),
      marginBottom: space(4),
    },
    button: {
      alignSelf: 'stretch',
      marginTop: space(2),
    },
  });
