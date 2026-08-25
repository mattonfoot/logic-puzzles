import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Text } from '../ui/Text';
import { palette, radius, shadow, space } from '../ui/theme';
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
 * Confirmation for the two destructive actions. Written as a component rather
 * than `Alert.alert` so it behaves the same everywhere the app runs.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep it',
  onConfirm,
  onCancel,
}: Props) {
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
            label={cancelLabel}
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

const styles = StyleSheet.create({
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
