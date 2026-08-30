import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { briefingFor } from '../data/briefings';
import type { Puzzle } from '../puzzle/types';
import { feedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  visible: boolean;
  puzzle: Puzzle;
  onClose: () => void;
}

/**
 * What went wrong, and why anybody wants it sorted out.
 *
 * It opens by itself when a puzzle starts, because a table of facts about people
 * who do not exist is a table of facts about people who do not exist until
 * somebody says what is at stake. After that it lives behind **Info**, for the
 * player who wants the scene back or who picked the game up a day later and has
 * forgotten what the fuss was about.
 *
 * It says what happened and never what the answer is, so opening it is free —
 * unlike a clue, it costs nothing and is not counted.
 */
export function BriefingPopup({ visible, puzzle, onClose }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  if (!visible) return null;

  const briefing = briefingFor(puzzle);

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
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: tint(palette.accent, 0.12) }]}>
              <Icon name={puzzle.themeIcon} size={30} color={palette.accent} />
            </View>
            <View style={styles.headText}>
              <Text style={[styles.theme, { color: palette.accent }]}>{puzzle.themeName}</Text>
              <Text style={styles.title}>{briefing.title}</Text>
            </View>
          </View>

          {/* The longest of these runs to four lines on a narrow phone, and a
              story cut off halfway is worse than no story. */}
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{briefing.body}</Text>
          </ScrollView>

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
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
    },
    icon: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: {
      flex: 1,
    },
    theme: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      color: palette.ink,
      marginTop: space(0.5),
    },
    bodyScroll: {
      // Tall enough for the longest of them, short enough to leave the board
      // showing round the edges of the window.
      maxHeight: 260,
      marginTop: space(4),
    },
    body: {
      fontSize: 15,
      lineHeight: 23,
      color: palette.inkSoft,
    },
    dismiss: {
      fontSize: 11,
      color: palette.inkFaint,
      textAlign: 'center',
      marginTop: space(4),
    },
  });
