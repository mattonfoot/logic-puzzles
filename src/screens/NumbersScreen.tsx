import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { completedOnPage, pageNumbers } from '../game/library';
import type { CompletedGame } from '../game/persistence';
import { formatDuration } from '../game/time';
import type { SizeOption } from '../puzzle/types';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, shadow, space, tint, type Palette } from '../ui/theme';
import { TitlePanel } from '../ui/TitlePanel';

interface Props {
  size: SizeOption;
  busy: boolean;
  history: CompletedGame[];
  /** Starts the numbered game: the number is the seed. */
  onPlay: (number: number) => void;
  onBack: () => void;
}

/**
 * Every game at one difficulty, numbered from one.
 *
 * A puzzle is decided by its seed and its shape, and the generator is
 * deterministic, so the number *is* the puzzle: game 7 at Expert is the same
 * seven items, the same answer and the same clues on anybody's phone, this year
 * or next. That turns a wall of random games into something with an order to
 * work through, and gives two players something to compare.
 *
 * A game already finished carries its time on the right of its number. That is
 * the whole of the record kept here — no ticks, no stars — because a time is
 * both the fact that it is done and a thing to beat.
 *
 * It wears the same panel the front door and the difficulties do, given the
 * same half of the screen, so walking Play → a difficulty → a number changes
 * the bottom half three times and never the top. That leaves half a screen for
 * the numbers, which is why a page holds six: the list is paged rather than
 * scrolled, and a page that has to be scrolled to be read is a page that has
 * lost the point of being one. The two links that move between them sit at the
 * foot, where the eye ends up.
 */
export function NumbersScreen({ size, busy, history, onPlay, onBack }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const [page, setPage] = useState(0);

  const numbers = useMemo(() => pageNumbers(page), [page]);
  const done = useMemo(
    () => completedOnPage(history, size.id, numbers),
    [history, size.id, numbers],
  );

  return (
    <View style={styles.screen}>
      <TitlePanel />

      <View style={styles.bottom}>
        <View style={styles.content}>
          <RuledTitle>{`Play ${size.difficulty}`}</RuledTitle>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {numbers.map((number) => {
              const game = done.get(number);
              return (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  accessibilityLabel={`Game ${number}`}
                  accessibilityHint={
                    game ? `Finished in ${formatDuration(game.seconds)}` : `${size.label}`
                  }
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={() => {
                    feedback.tap();
                    onPlay(number);
                  }}
                  style={({ pressed }) => [styles.row, { opacity: busy ? 0.4 : pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.number, { color: palette.accent }]}>{number}</Text>
                  {game ? <Text style={styles.time}>{formatDuration(game.seconds)}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Under the list and at the foot of it, so the two sit where a page
              ends rather than floating halfway up with nothing beneath them. The
              first page has nothing before it, so Previous is drawn held back
              rather than moved — a row that changes shape as you page through it
              is a row you have to find again each time. */}
          <View style={styles.pager}>
            <PageLink
              label="Previous"
              disabled={page === 0 || busy}
              onPress={() => setPage((at) => Math.max(0, at - 1))}
            />
            <PageLink label="Next" disabled={busy} onPress={() => setPage((at) => at + 1)} />
          </View>
        </View>

        <BackLink label="Back to the difficulties" onPress={onBack} />
      </View>

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

function PageLink({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.pageLink, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Text style={styles.pageText}>{label}</Text>
    </Pressable>
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
      paddingTop: space(4),
    },
    list: {
      paddingTop: space(3),
      // Six fit the half of the screen this stands in on the phones this is
      // drawn for. A shorter one scrolls the numbers rather than pushing the
      // pager off the bottom, which is the one thing on the screen that has to
      // stay put for the list to be usable at all.
      paddingBottom: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space(1),
    },
    number: {
      fontSize: 26,
      lineHeight: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    time: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.inkSoft,
    },
    pager: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: space(2),
    },
    pageText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: palette.accent,
    },
    pageLink: {
      paddingVertical: space(2),
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
