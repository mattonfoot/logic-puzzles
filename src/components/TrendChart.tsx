import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDuration } from '../game/time';
import { Text } from '../ui/Text';
import { chart, palette, radius, space } from '../ui/theme';

interface Props {
  /** Solve times in seconds, oldest → newest. */
  times: number[];
  /** Dates matching `times`, used in the caption when a column is tapped. */
  finishedAt: number[];
  /** How many of the most recent solves to draw. */
  limit?: number;
}

const PLOT_HEIGHT = 108;
const MIN_BAR = 4;

/**
 * Recent solve times as a column chart: one series, shorter is faster.
 * The most recent time is labelled, the average is drawn as a reference line,
 * and tapping a column names it — no number sits on every bar.
 */
export function TrendChart({ times, finishedAt, limit = 10 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const shown = times.slice(-limit);
  const dates = finishedAt.slice(-limit);
  if (shown.length < 2) return null;

  const slowest = Math.max(...shown);
  const fastest = Math.min(...shown);
  const average = shown.reduce((total, value) => total + value, 0) / shown.length;
  const heightFor = (value: number) => Math.max(MIN_BAR, (value / slowest) * PLOT_HEIGHT);
  const active = selected !== null && selected < shown.length ? selected : shown.length - 1;

  return (
    <View>
      <View style={styles.plot}>
        <View style={[styles.referenceLine, { bottom: heightFor(average) }]} />
        <Text style={[styles.referenceLabel, { bottom: heightFor(average) + 2 }]}>
          avg {formatDuration(average)}
        </Text>

        <View style={styles.columns}>
          {shown.map((value, index) => {
            const isActive = index === active;
            return (
              <Pressable
                key={`${dates[index]}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Solve ${index + 1} of ${shown.length}, ${formatDuration(value)}`}
                onPress={() => setSelected(index)}
                style={styles.column}
              >
                <View
                  style={[
                    styles.bar,
                    {
                      height: heightFor(value),
                      backgroundColor: chart.series,
                      opacity: isActive ? 1 : 0.55,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.baseline} />

      <View style={styles.captionRow}>
        <Text style={styles.caption}>
          {new Date(dates[active]).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}{' '}
          · {formatDuration(shown[active])}
          {shown[active] === fastest ? ' · best' : ''}
        </Text>
        <Text style={styles.captionMuted}>last {shown.length} solves · shorter is faster</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: PLOT_HEIGHT,
    justifyContent: 'flex-end',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: PLOT_HEIGHT,
  },
  column: {
    flex: 1,
    // Keeps two or three solves from turning into slabs.
    maxWidth: 34,
    height: PLOT_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  referenceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: chart.reference,
  },
  referenceLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    color: palette.inkFaint,
  },
  baseline: {
    height: 1,
    backgroundColor: chart.grid,
    marginBottom: space(2),
  },
  captionRow: {
    gap: space(0.5),
  },
  caption: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink,
  },
  captionMuted: {
    fontSize: 11,
    color: palette.inkFaint,
  },
});
