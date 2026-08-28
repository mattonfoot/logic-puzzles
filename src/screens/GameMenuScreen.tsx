import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Puzzle } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { accentById, nextAccent } from '../ui/accents';
import { RuledTitle } from '../ui/RuledTitle';
import { ActionRow, CheckRow, CycleRow } from '../ui/SettingRow';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate: boolean;
  /** Whether ticks that follow from other ticks are filled in. */
  autoFacts: boolean;
  /** The colour the app is drawn in, which is the player's rather than the puzzle's. */
  accent: string;
  onChangeAccent: (accent: string) => void;
  onToggleAutoEliminate: () => void;
  onToggleAutoFacts: () => void;
  onRestart: () => void;
  onClose: () => void;
}

/**
 * Everything that acts on the game as a whole rather than on a square: what the
 * board works out for itself, and starting this one over. They live here so the
 * playing screen carries only what a player reaches for mid-puzzle.
 *
 * There is no way to be shown the answer. A puzzle that can be given up on is a
 * puzzle nobody has to finish, and finishing it is the whole of the game.
 *
 * Starting a different puzzle is not one of them: the board's own `◀ Back`
 * goes to the setup screen, which is where a puzzle is chosen, so the menu would
 * only be offering a second door to the same room.
 *
 * It is a screen like any other, so it names itself the same way — `RuledTitle`
 * — sets its two settings the way the settings screen does, and is left the
 * same way: `◀ Back` at the foot of it, rather than a cross in the corner the
 * board uses for the button that opened this. The puzzle it belongs to is named
 * under the title, since these are read while a particular game is waiting
 * behind them. What is on it is the player's rather than the puzzle's — the
 * board pair and the colour the app draws in — which is exactly why it is worth
 * reaching without leaving the game.
 *
 * Restarting throws away a board the player has filled in and no longer carries
 * a line saying so, so it asks first — the same way discarding a saved game and
 * clearing the statistics do.
 */
export function GameMenuScreen({
  puzzle,
  autoEliminate,
  autoFacts,
  accent,
  onChangeAccent,
  onToggleAutoEliminate,
  onToggleAutoFacts,
  onRestart,
  onClose,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space(5) }]}
        showsVerticalScrollIndicator={false}
      >
        <RuledTitle>Puzzle settings</RuledTitle>
        <Text style={styles.subtitle} numberOfLines={1}>
          #{puzzle.seed}
        </Text>

        <View style={styles.list}>
          <CheckRow
            label="Automatic crosses"
            on={autoEliminate}
            accent={palette.accent}
            onPress={onToggleAutoEliminate}
          />
          <CheckRow
            label="Auto add facts"
            on={autoFacts}
            accent={palette.accent}
            onPress={onToggleAutoFacts}
          />
          <CycleRow
            label="Colour"
            value={accentById(accent).name}
            onPress={() => onChangeAccent(nextAccent(accent).id)}
          />
        </View>

        <View style={styles.section}>
          <RuledTitle>This puzzle</RuledTitle>
        </View>

        <View style={styles.list}>
          <ActionRow
            label="Restart puzzle"
            accent={palette.accent}
            onPress={() => setConfirming(true)}
          />
        </View>
      </ScrollView>

      <BackLink label="Back to the board" onPress={onClose} />

      <ConfirmDialog
        visible={confirming}
        title="Restart this puzzle?"
        message="The same puzzle comes back with an empty board and the clock at zero."
        confirmLabel="Restart it"
        onConfirm={() => {
          setConfirming(false);
          onRestart();
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    content: {
      paddingHorizontal: space(4),
      paddingBottom: space(6),
    },
    subtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(1.5),
    },
    list: {
      marginTop: space(4),
      gap: space(2),
    },
    section: {
      marginTop: space(6),
    },
  });
