import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SolvedPanel } from '../components/SolvedPanel';
import { sizeById } from '../data/sizes';
import { THEMES } from '../data/themes';
import type { CompletedGame } from '../game/persistence';
import { t } from '../i18n';
import { shareResult } from '../game/share';
import { generatePuzzle } from '../puzzle/generator';
import { feedback } from '../ui/feedback';
import { BackLink } from '../ui/BackLink';
import { space, type Palette } from '../ui/theme';
import { useStyles } from '../ui/ThemeProvider';

interface Props {
  game: CompletedGame;
  onBack: () => void;
}

/**
 * A game already finished, read back.
 *
 * Nothing about the result is stored beyond the clock, the clue count and the
 * seed — the puzzle itself is built again from that seed, which is the whole
 * point of a seed: the same number and the same shape give back the same cast,
 * the same answer and the same clues, so the answer table here is the one the
 * player actually solved rather than a copy of it kept on disk.
 *
 * It is what a daily challenge shows once it is done. There is no board behind
 * it and no way to one: a challenge played is played.
 */
export function ResultScreen({ game, onBack }: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const puzzle = useMemo(
    () => generatePuzzle({ theme: THEMES, size: sizeById(game.sizeId), seed: game.seed }),
    [game.seed, game.sizeId],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.body, { paddingTop: insets.top + space(4) }]}>
        <SolvedPanel
          title={t('solved.title')}
          puzzle={puzzle}
          seconds={game.seconds}
          cluesUsed={game.cluesUsed ?? 0}
          // How it compared was news on the day it was finished. Read back, it
          // is a record rather than a result.
          improvement={null}
          onShare={() => {
            feedback.tap();
            void shareResult({
              puzzle,
              seconds: game.seconds,
              cluesUsed: game.cluesUsed ?? 0,
              daily: true,
            });
          }}
        />
      </View>

      <BackLink label={t('common.back')} onPress={onBack} />
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    body: {
      flex: 1,
      paddingHorizontal: space(4),
    },
  });
