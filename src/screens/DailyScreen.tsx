import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIZES } from '../data/sizes';
import { dailyDone } from '../game/library';
import type { CompletedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  busy: boolean;
  history: CompletedGame[];
  /** Starts today's challenge at this difficulty. */
  onPlay: (size: SizeOption) => void;
  /** Opens the result of one already finished today. */
  onShowResult: (game: CompletedGame) => void;
  onBack: () => void;
}

/**
 * Today's four challenges, one per difficulty.
 *
 * They are seeded by the date, so everybody gets the same four puzzles on the
 * same day and there is a right answer to "what did you get". Each is played
 * once: finish one and its row shows the time instead, and pressing it opens
 * the result rather than the board. A daily you can replay until you like your
 * time is not a daily.
 *
 * "Once" means today rather than ever. Tomorrow the date moves the seed on and
 * all four are open again.
 */
export function DailyScreen({ busy, history, onPlay, onShowResult, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  // Resolved once per render rather than per row, so every row reads the same
  // clock even if one is drawn either side of midnight.
  const now = useMemo(() => new Date(), []);
  const done = useMemo(
    () => new Map(SIZES.map((size) => [size.id, dailyDone(history, size.id, now)])),
    [history, now],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + space(5) }]}>
        <RuledTitle>Daily challenges</RuledTitle>

        <View style={styles.list}>
          {SIZES.map((size) => {
            const game = done.get(size.id) ?? null;
            return (
              <Pressable
                key={size.id}
                accessibilityRole="button"
                accessibilityLabel={size.difficulty}
                accessibilityHint={
                  game ? `Done in ${formatDuration(game.seconds)} — opens the result` : size.label
                }
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => {
                  feedback.tap();
                  if (game) onShowResult(game);
                  else onPlay(size);
                }}
                style={({ pressed }) => [styles.row, { opacity: busy ? 0.4 : pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.name, { color: game ? palette.inkSoft : palette.accent }]}>
                  {size.difficulty}
                </Text>
                {game ? <Text style={styles.time}>{formatDuration(game.seconds)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <BackLink label="Back" onPress={onBack} />

      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.busyText}>Building your puzzle…</Text>
          </View>
        </View>
      ) : null}
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
      flex: 1,
      paddingHorizontal: space(4),
    },
    list: {
      marginTop: space(4),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingVertical: space(1),
    },
    name: {
      fontSize: 33,
      lineHeight: 44,
      fontWeight: '800',
      letterSpacing: -1,
    },
    time: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.inkSoft,
    },
    busyOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: tint(palette.bg, 0.72),
      alignItems: 'center',
      justifyContent: 'center',
    },
    busyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      paddingVertical: space(3),
      paddingHorizontal: space(5),
    },
    busyText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.ink,
    },
  });
