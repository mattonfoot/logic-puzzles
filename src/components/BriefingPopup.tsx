import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { briefingFor } from '../data/briefings';
import type { Puzzle } from '../puzzle/types';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, tint, type Palette } from '../ui/theme';
import { Popup } from './Popup';

interface Props {
  visible: boolean;
  puzzle: Puzzle;
  /**
   * What to say instead of the puzzle's own briefing, for a board that has no
   * mystery to set up but does have something to say before it starts. A
   * lesson opens on this window for the same reason a puzzle does — a grid of
   * squares means nothing until somebody says what it is for — so it is the
   * same window rather than one that looks like it.
   */
  title?: string;
  body?: string;
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
export function BriefingPopup({ visible, puzzle, title, body, onClose }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  if (!visible) return null;

  const briefing = briefingFor(puzzle);

  return (
    <Popup visible onClose={onClose}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tint(palette.accent, 0.12) }]}>
          <Icon name={puzzle.themeIcon} size={30} color={palette.accent} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.theme, { color: palette.accent }]}>{puzzle.themeName}</Text>
          <Text style={styles.title}>{title ?? briefing.title}</Text>
        </View>
      </View>

      {/* The longest of these runs to four lines on a narrow phone, and a
          story cut off halfway is worse than no story. */}
      <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{body ?? briefing.body}</Text>
      </ScrollView>
    </Popup>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
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
  });
