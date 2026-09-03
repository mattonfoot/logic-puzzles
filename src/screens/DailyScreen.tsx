import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SIZES } from '../data/sizes';
import { dailyDone, dailyStreak } from '../game/library';
import type { CompletedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import { plural, t } from '../i18n';
import type { SizeOption } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type, type Palette } from '../ui/theme';
import { TitlePanel } from '../ui/TitlePanel';

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
 *
 * It wears the front door's panel in the top half, the way every screen before
 * a board does, so the two ways in look like two halves of the same page rather
 * than two different apps.
 */
export function DailyScreen({ busy, history, onPlay, onShowResult, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  // Resolved once per render rather than per row, so every row reads the same
  // clock even if one is drawn either side of midnight.
  const now = useMemo(() => new Date(), []);
  const done = useMemo(
    () => new Map(SIZES.map((size) => [size.id, dailyDone(history, size.id, now)])),
    [history, now],
  );
  const streak = useMemo(() => dailyStreak(history, now), [history, now]);

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <View style={styles.content}>
          <RuledTitle>{t('daily.title')}</RuledTitle>
          {/* One line, and only for somebody who has one. The app counts
              nothing at the player, and a run of days is the one number here
              that is theirs to keep rather than the app's to press. */}
          {streak > 0 ? (
            <Text style={[styles.streak, { color: palette.accent }]}>
              {plural('daily.streak', streak)}
            </Text>
          ) : null}

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {SIZES.map((size) => {
              const game = done.get(size.id) ?? null;
              return (
                <Pressable
                  key={size.id}
                  accessibilityRole="button"
                  accessibilityLabel={size.difficulty}
                  accessibilityHint={
                    game ? t('daily.doneHint', { clock: formatDuration(game.seconds) }) : size.label
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
          </ScrollView>
        </View>

        <BackLink label={t('daily.back')} onPress={onBack} />
      </View>

      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <View style={[styles.busyCard, shadow.card]}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.busyText}>{t('common.building')}</Text>
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
    // The panel is the top half; this is the other one.
    bottom: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: space(5),
      paddingTop: space(5),
    },
    streak: {
      ...type.note,
      // Sits under the title, in the gap the title already leaves.
      marginTop: -space(2),
      marginBottom: space(2),
    },
    list: {
      paddingBottom: space(4),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingVertical: space(1),
    },
    name: type.menu,
    time: {
      ...type.note,
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
      ...type.note,
      color: palette.ink,
    },
  });
