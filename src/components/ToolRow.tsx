import React from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { useStyles } from '../ui/ThemeProvider';
import { space } from '../ui/theme';
import { ToolButton } from '../ui/ToolButton';

interface Props {
  onUndo: () => void;
  undoDisabled: boolean;
  onClue: () => void;
  clueDisabled?: boolean;
  onInfo: () => void;
  onHighlight: () => void;
  /** Whether the highlight is on. */
  lit: boolean;
  highlightDisabled: boolean;
}

/**
 * What a board is worked with: taking a mark back and reading a clue on the
 * left, and on the right the story behind it and the one that lights the clue
 * up on the grids it talks about. The same four words on the same row in a
 * game and in a lesson, which is what a lesson is for.
 */
export function ToolRow({
  onUndo,
  undoDisabled,
  onClue,
  clueDisabled = false,
  onInfo,
  onHighlight,
  lit,
  highlightDisabled,
}: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.play}>
      <View style={styles.tools}>
        <ToolButton label={t('game.undo')} disabled={undoDisabled} onPress={onUndo} />
        <ToolButton label={t('game.clue')} disabled={clueDisabled} onPress={onClue} />
      </View>
      <View style={styles.tools}>
        <ToolButton label={t('game.info')} onPress={onInfo} />
        <ToolButton
          label={t('game.highlight')}
          active={lit}
          disabled={highlightDisabled}
          onPress={onHighlight}
        />
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    play: {
      flexDirection: 'row',
      alignItems: 'center',
      // The two that work the clue at one end, the two about it at the other,
      // and the board's own width between them.
      justifyContent: 'space-between',
      gap: space(2),
    },
    tools: {
      flexDirection: 'row',
      gap: space(2),
    },
  });
