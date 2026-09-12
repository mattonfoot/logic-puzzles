import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { numberOn } from '../game/library';
import { t } from '../i18n';
import type { Puzzle } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { accentById, nextAccent } from '../ui/accents';
import { RuledTitle } from '../ui/RuledTitle';
import { ActionRow, CheckRow, CycleRow } from '../ui/SettingRow';
import { Text } from '../ui/Text';
import { useStyles, useTheme, type ColourPreference } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

interface Props {
  puzzle: Puzzle;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate: boolean;
  /** Whether ticks that follow from other ticks are filled in. */
  autoFacts: boolean;
  /** Whether a mark that argues with a clue already read is shaded. */
  checkClues: boolean;
  /** The colour the app is drawn in, which is the player's rather than the puzzle's. */
  accent: string;
  /** Day, night, or whatever the device is doing. */
  colours: ColourPreference;
  onChangeAccent: (accent: string) => void;
  onChangeColours: (colours: ColourPreference) => void;
  onToggleAutoEliminate: () => void;
  onToggleAutoFacts: () => void;
  onToggleCheckClues: () => void;
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
 * — sets each of its settings exactly the way the settings screen sets it, and
 * is left the same way: `◀ Back` at the foot of it, rather than a cross in the
 * corner the board uses for the button that opened this. The puzzle it belongs
 * to is named under the title, since these are read while a particular game is
 * waiting behind them.
 *
 * Everything on it is the player's rather than the puzzle's — what the board
 * works out, how it is coloured, whether it is night — which is exactly why it
 * is worth reaching without leaving the game. The colour scheme most of all:
 * night is something a room does rather than something a player decides once,
 * and a board is where it gets noticed.
 *
 * Restarting throws away a board the player has filled in and no longer carries
 * a line saying so, so it asks first — the same way discarding a saved game and
 * clearing the statistics do.
 */
export function GameMenuScreen({
  puzzle,
  autoEliminate,
  autoFacts,
  checkClues,
  accent,
  colours,
  onChangeAccent,
  onChangeColours,
  onToggleAutoEliminate,
  onToggleAutoFacts,
  onToggleCheckClues,
  onRestart,
  onClose,
}: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const auto = colours === 'auto';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space(5) }]}
        showsVerticalScrollIndicator={false}
      >
        <RuledTitle>{t('menu.title')}</RuledTitle>
        {/* The number the player picked, the same way the board's own header
            says it. The two are a tap apart and were disagreeing: the board
            read the number out of the seed and this printed the seed. */}
        <Text style={styles.subtitle} numberOfLines={1}>
          {t('game.seed', { seed: numberOn(puzzle.seed, puzzle.size.id) ?? puzzle.seed })}
        </Text>

        <View style={styles.list}>
          <CheckRow
            label={t('menu.automaticCrosses')}
            on={autoEliminate}
            accent={palette.accent}
            onPress={onToggleAutoEliminate}
          />
          <CheckRow
            label={t('menu.autoAddFacts')}
            on={autoFacts}
            accent={palette.accent}
            onPress={onToggleAutoFacts}
          />
          <CheckRow
            label={t('menu.checkAgainstClues')}
            on={checkClues}
            accent={palette.accent}
            onPress={onToggleCheckClues}
          />
          {/* The same pair, in the same order and with the same rules, as the
              settings screen sets them by. Night is a thing a room does rather
              than a thing a player decides once, and the board is where it gets
              noticed — so it is reachable without putting the puzzle down. */}
          <CheckRow
            label={t('menu.matchDevice')}
            on={auto}
            accent={palette.accent}
            onPress={() =>
              onChangeColours(auto ? (palette.scheme === 'night' ? 'night' : 'day') : 'auto')
            }
          />
          <CheckRow
            label={t('menu.nightColours')}
            on={palette.scheme === 'night'}
            accent={palette.accent}
            // Shown as it stands, but the device is deciding it.
            disabled={auto}
            onPress={() => onChangeColours(colours === 'night' ? 'day' : 'night')}
          />
          <CycleRow
            label={t('menu.colour')}
            value={accentById(accent).name}
            onPress={() => onChangeAccent(nextAccent(accent).id)}
          />
        </View>

        <View style={styles.section}>
          <RuledTitle>{t('menu.thisPuzzle')}</RuledTitle>
        </View>

        <View style={styles.list}>
          <ActionRow
            label={t('menu.restart')}
            accent={palette.accent}
            onPress={() => setConfirming(true)}
          />
        </View>
      </ScrollView>

      <BackLink label={t('menu.back')} onPress={onClose} />

      <ConfirmDialog
        visible={confirming}
        title={t('menu.confirm.title')}
        message={t('menu.confirm.body')}
        confirmLabel={t('menu.confirm.confirmLabel')}
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
