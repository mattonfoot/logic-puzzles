import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrendChart } from '../components/TrendChart';
import { THEMES } from '../data/themes';
import type { CompletedGame } from '../game/persistence';
import { formatDuration, formatSpan } from '../game/time';
import type { OverallStats, SizeStats } from '../stats/summary';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { radius, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  stats: OverallStats;
  history: CompletedGame[];
  onBack: () => void;
  onClearHistory: () => void;
}

export function StatsScreen({ stats, history, onBack, onClearHistory }: Props) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const played = stats.sizes.filter((size) => size.solved > 0);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const selected = useMemo<SizeStats | null>(() => {
    if (played.length === 0) return null;
    const chosen = played.find((size) => size.sizeId === sizeId);
    if (chosen) return chosen;
    // Default to the shape with the most solves — the one with a trend worth
    // looking at — rather than whichever comes last in the list.
    return played.reduce((best, size) => (size.solved > best.solved ? size : best), played[0]);
  }, [played, sizeId]);

  const selectedGames = useMemo(
    () =>
      selected
        ? history.filter((game) => game.sizeId === selected.sizeId && !game.revealed).reverse()
        : [],
    [history, selected],
  );

  const clearEverything = () => {
    feedback.warn();
    setConfirmingClear(false);
    onClearHistory();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Statistics" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {stats.solved === 0 ? (
          <View style={[styles.card, shadow.card, styles.empty]}>
            <View style={styles.emptyMark}>
              <Icon name="ui/icon-chart" size={40} color={palette.inkFaint} />
            </View>
            <Text style={styles.emptyTitle}>No finished puzzles yet</Text>
            <Text style={styles.emptyText}>
              Solve one and your time lands here. After a few, you will see whether you are getting
              quicker.
            </Text>
          </View>
        ) : null}

        {stats.solved > 0 ? (
          <View style={styles.tiles}>
            <View style={styles.tileRow}>
              <Tile label="Solved" value={`${stats.solved}`} />
              <Tile label="Time played" value={formatSpan(stats.totalSeconds)} />
              <Tile
                label="Streak"
                value={`${stats.currentStreak}d`}
                hint={`best ${stats.longestStreak}d`}
              />
            </View>
            <View style={styles.tileRow}>
              <Tile label="Clues read" value={`${stats.cluesUsed}`} />
              <Tile
                label="Per puzzle"
                value={stats.averageClues === null ? '—' : stats.averageClues.toFixed(1)}
                hint="clues"
              />
              <Tile label="Themes" value={`${stats.themesPlayed}/${THEMES.length}`} />
            </View>
          </View>
        ) : null}

        {played.length > 0 ? (
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>By difficulty</Text>
            <View style={styles.sizeTable}>
              <View style={styles.sizeHeaderRow}>
                <Text style={styles.sizeHeaderWide}>Difficulty</Text>
                <Text style={styles.sizeHeaderCell}>Solved</Text>
                <Text style={styles.sizeHeaderCell}>Best</Text>
                <Text style={styles.sizeHeaderCell}>Average</Text>
              </View>
              {stats.sizes.map((size) => (
                <View key={size.sizeId} style={styles.sizeRow}>
                  <View style={styles.sizeCellWide}>
                    <Text style={styles.sizeCellName}>{size.difficulty}</Text>
                    {/* The shape as well: it is what the difficulty means. */}
                    <Text style={styles.sizeCellShape}>{size.sizeLabel}</Text>
                  </View>
                  <Text style={styles.sizeCell}>{size.solved || '—'}</Text>
                  <Text style={styles.sizeCell}>
                    {size.bestSeconds === null ? '—' : formatDuration(size.bestSeconds)}
                  </Text>
                  <Text style={styles.sizeCell}>
                    {size.averageSeconds === null ? '—' : formatDuration(size.averageSeconds)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {selected ? (
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>Are you getting faster?</Text>
            <Text style={styles.cardSubtitle}>Recent solve times, one column per puzzle</Text>

            <View style={styles.pillRow}>
              {played.map((size) => {
                const isSelected = size.sizeId === selected.sizeId;
                return (
                  <Pressable
                    key={size.sizeId}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      feedback.tap();
                      setSizeId(size.sizeId);
                    }}
                    style={[
                      styles.pill,
                      {
                        borderColor: isSelected ? palette.chart.series : palette.line,
                        backgroundColor: isSelected
                          ? tint(palette.chart.series, 0.12)
                          : palette.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, isSelected && { color: palette.chart.series }]}>
                      {size.difficulty}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TrendBanner size={selected} />

            {selected.times.length >= 2 ? (
              <TrendChart
                times={selected.times}
                finishedAt={selectedGames.map((game) => game.finishedAt)}
              />
            ) : (
              <Text style={styles.cardSubtitle}>
                One more {selected.difficulty} solve and the trend shows up here.
              </Text>
            )}
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>Recent games</Text>
            {stats.recent.map((game) => (
              <View key={`${game.seed}-${game.finishedAt}`} style={styles.gameRow}>
                <View style={styles.gameMark}>
                  <Icon name={game.themeIcon} size={22} color={game.accent} />
                </View>
                <View style={styles.gameText}>
                  <Text style={styles.gameTitle}>
                    {game.themeName} · {game.difficulty}
                  </Text>
                  <Text style={styles.gameMeta}>
                    {new Date(game.finishedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {game.cluesUsed === null
                      ? ''
                      : ` · ${game.cluesUsed} clue${game.cluesUsed === 1 ? '' : 's'}`}
                  </Text>
                </View>
                <Text style={[styles.gameTime, game.revealed && styles.gameTimeMuted]}>
                  {game.revealed ? 'revealed' : formatDuration(game.seconds)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {history.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmingClear(true)}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>Clear statistics</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BackLink label="Back" onPress={onBack} />

      <ConfirmDialog
        visible={confirmingClear}
        title="Clear statistics?"
        message="This deletes every finished game and all your times. It cannot be undone."
        confirmLabel="Clear statistics"
        cancelLabel="Keep them"
        onConfirm={clearEverything}
        onCancel={() => setConfirmingClear(false)}
      />
    </View>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.tile, shadow.card]}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

/** The plain-language version of the trend the chart draws. */
function TrendBanner({ size }: { size: SizeStats }) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  if (size.trend === null || size.recentAverage === null || size.earlierAverage === null) {
    return (
      <Text style={styles.trendNeutral}>
        {size.solved} solved · best {formatDuration(size.bestSeconds ?? 0)}. A few more and the
        trend below fills in.
      </Text>
    );
  }

  const faster = size.trend > 0;
  const share = Math.round(Math.abs(size.trend) * 100);
  const steady = share < 2;

  return (
    <View
      style={[
        styles.trendBanner,
        {
          backgroundColor: tint(
            steady ? palette.ink : faster ? palette.success : palette.ink,
            0.08,
          ),
        },
      ]}
    >
      <Text style={[styles.trendHeadline, !steady && faster && { color: palette.success }]}>
        {steady ? 'Holding steady' : faster ? `${share}% faster lately` : `${share}% slower lately`}
      </Text>
      <Text style={styles.trendDetail}>
        Last {Math.min(size.solved, 5)} average {formatDuration(size.recentAverage)} vs{' '}
        {formatDuration(size.earlierAverage)} before that.
      </Text>
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
      paddingTop: space(2),
      paddingBottom: space(6),
      gap: space(3),
    },
    card: {
      backgroundColor: palette.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: palette.line,
      padding: space(4),
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.ink,
    },
    cardSubtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(0.5),
      marginBottom: space(2),
    },
    tiles: {
      gap: space(3),
    },
    tileRow: {
      flexDirection: 'row',
      gap: space(3),
    },
    tile: {
      flex: 1,
      backgroundColor: palette.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: palette.line,
      paddingVertical: space(3),
      alignItems: 'center',
    },
    tileValue: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.ink,
    },
    tileLabel: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: palette.inkFaint,
      marginTop: space(1),
    },
    tileHint: {
      fontSize: 10,
      color: palette.inkFaint,
      marginTop: 1,
    },
    sizeTable: {
      marginTop: space(3),
    },
    sizeHeaderRow: {
      flexDirection: 'row',
      paddingBottom: space(2),
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    sizeRow: {
      flexDirection: 'row',
      // The first cell carries two lines; the numbers sit against the middle
      // of it rather than hanging from the top.
      alignItems: 'center',
      paddingVertical: space(2.5),
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    sizeHeaderCell: {
      flex: 1,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: palette.inkFaint,
      textAlign: 'right',
    },
    sizeCell: {
      flex: 1,
      fontSize: 13,
      color: palette.inkSoft,
      textAlign: 'right',
    },
    sizeHeaderWide: {
      flex: 1.4,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: palette.inkFaint,
    },
    sizeCellWide: {
      flex: 1.4,
    },
    sizeCellName: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.ink,
    },
    sizeCellShape: {
      fontSize: 11,
      color: palette.inkFaint,
      marginTop: 1,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      // Apart, for the same reason as the size buttons on the home screen: the
      // chosen one's border would be painted over by the pill beside it.
      gap: space(2),
      marginBottom: space(3),
    },
    pill: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: space(3),
      paddingVertical: space(1.5),
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.inkSoft,
    },
    trendBanner: {
      borderRadius: radius.sm,
      padding: space(3),
      marginBottom: space(4),
    },
    trendHeadline: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.ink,
    },
    trendDetail: {
      fontSize: 12,
      color: palette.inkSoft,
      marginTop: space(0.5),
    },
    trendNeutral: {
      fontSize: 13,
      color: palette.inkSoft,
      marginBottom: space(3),
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      paddingVertical: space(2.5),
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    gameMark: {
      width: 24,
      alignItems: 'center',
    },
    gameText: {
      flex: 1,
    },
    gameTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.ink,
    },
    gameMeta: {
      fontSize: 11,
      color: palette.inkFaint,
      marginTop: 1,
    },
    gameTime: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    gameTimeMuted: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.inkFaint,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: space(8),
    },
    emptyMark: {
      alignItems: 'center',
      marginBottom: space(1),
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.ink,
      marginTop: space(2),
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 19,
      color: palette.inkSoft,
      textAlign: 'center',
      marginTop: space(1),
    },
    clearButton: {
      alignSelf: 'center',
      paddingVertical: space(3),
    },
    clearText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.danger,
    },
  });
