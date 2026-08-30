import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrendChart } from '../components/TrendChart';
import { THEMES } from '../data/themes';
import { plural, t } from '../i18n';
import type { CompletedGame } from '../game/persistence';
import { formatDuration, formatSpan } from '../game/time';
import type { OverallStats, SizeStats } from '../stats/summary';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { RuledTitle } from '../ui/RuledTitle';
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
  const insets = useSafeAreaInsets();
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
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space(5) }]}
        showsVerticalScrollIndicator={false}
      >
        <RuledTitle style={styles.title}>{t('stats.title')}</RuledTitle>

        {stats.solved === 0 ? (
          <View style={[styles.card, shadow.card, styles.empty]}>
            <View style={styles.emptyMark}>
              <Icon name="ui/icon-chart" size={40} color={palette.inkFaint} />
            </View>
            <Text style={styles.emptyTitle}>{t('stats.empty')}</Text>
            <Text style={styles.emptyText}>{t('stats.emptyBody')}</Text>
          </View>
        ) : null}

        {stats.solved > 0 ? (
          <View style={styles.tiles}>
            <View style={styles.tileRow}>
              <Tile label={t('stats.solved')} value={`${stats.solved}`} />
              <Tile label={t('stats.timePlayed')} value={formatSpan(stats.totalSeconds)} />
              <Tile
                label={t('stats.streak')}
                value={`${stats.currentStreak}d`}
                hint={t('stats.bestStreak', { days: stats.longestStreak })}
              />
            </View>
            <View style={styles.tileRow}>
              <Tile label={t('stats.cluesRead')} value={`${stats.cluesUsed}`} />
              <Tile
                label={t('stats.perPuzzle')}
                value={stats.averageClues === null ? '—' : stats.averageClues.toFixed(1)}
                hint={t('stats.perPuzzleUnit')}
              />
              <Tile label={t('stats.themes')} value={`${stats.themesPlayed}/${THEMES.length}`} />
            </View>
          </View>
        ) : null}

        {played.length > 0 ? (
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>{t('stats.byDifficulty')}</Text>
            <View style={styles.sizeTable}>
              <View style={styles.sizeHeaderRow}>
                <Text style={styles.sizeHeaderWide}>{t('stats.difficulty')}</Text>
                <Text style={styles.sizeHeaderCell}>{t('stats.solved')}</Text>
                <Text style={styles.sizeHeaderCell}>{t('stats.best')}</Text>
                <Text style={styles.sizeHeaderCell}>{t('stats.average')}</Text>
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
            <Text style={styles.cardTitle}>{t('stats.gettingFaster')}</Text>
            <Text style={styles.cardSubtitle}>{t('stats.chartCaption')}</Text>

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
            <Text style={styles.cardTitle}>{t('stats.recentGames')}</Text>
            {stats.recent.map((game) => (
              <View key={`${game.seed}-${game.finishedAt}`} style={styles.gameRow}>
                <View style={styles.gameMark}>
                  <Icon name={game.themeIcon} size={22} color={palette.accent} />
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
                    {game.cluesUsed === null ? '' : plural('stats.clues', game.cluesUsed)}
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
            <Text style={styles.clearText}>{t('stats.clearStatistics')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BackLink label={t('stats.back')} onPress={onBack} />

      <ConfirmDialog
        visible={confirmingClear}
        title={t('stats.confirm.title')}
        message={t('stats.confirm.body')}
        confirmLabel={t('stats.confirm.confirmLabel')}
        cancelLabel={t('stats.confirm.cancelLabel')}
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
        {t('stats.trendPending', {
          solved: size.solved,
          best: formatDuration(size.bestSeconds ?? 0),
        })}
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
        {steady
          ? t('stats.holdingSteady')
          : faster
            ? t('stats.fasterLately', { percent: share })
            : t('stats.slowerLately', { percent: share })}
      </Text>
      <Text style={styles.trendDetail}>
        {t('stats.trendDetail', {
          count: Math.min(size.solved, 5),
          recent: formatDuration(size.recentAverage),
          earlier: formatDuration(size.earlierAverage),
        })}
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
      paddingBottom: space(6),
      gap: space(3),
    },
    title: {
      marginBottom: space(1),
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
