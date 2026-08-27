import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { feedback } from './feedback';
import { Text } from './Text';
import { useStyles, useTheme } from './ThemeProvider';
import { space, type Palette } from './theme';

/** The knob's diameter, which a slider's track is sized around. */
const KNOB = 16;

/**
 * A setting that is either on or off: a box, ticked or empty, and its name.
 *
 * Nothing here explains what the setting does. Every one of them shows its
 * effect the moment it is touched, and a paragraph under each name turns a
 * handful of switches into a page to read.
 */
export function CheckRow({
  label,
  on,
  accent,
  disabled = false,
  onPress,
}: {
  label: string;
  on: boolean;
  /** Defaults to the app's link colour; a puzzle's screen uses its own. */
  accent?: string;
  /** Shown, but decided elsewhere. */
  disabled?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const colour = accent ?? palette.accent;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <View
        style={[styles.box, { borderColor: colour, backgroundColor: on ? colour : 'transparent' }]}
      >
        {on ? <Text style={[styles.tick, { color: palette.bg }]}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

/**
 * A setting with a few stops between two ends: its name, then a line with the
 * knob sitting where it currently is.
 *
 * The stops are named rather than numbered, so the track is divided into as
 * many zones as there are and a tap lands on the nearest — no dragging, which
 * on a four-position control is more work than it is worth.
 */
export function SliderRow({
  label,
  steps,
  index,
  accent,
  onChange,
}: {
  label: string;
  steps: readonly string[];
  index: number;
  accent?: string;
  onChange: (index: number) => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const colour = accent ?? palette.accent;
  const at = Math.max(0, index);
  // Where the knob's centre sits along its travel: the first stop is the
  // left-hand end of the line and the last is the right-hand one.
  const along = steps.length > 1 ? at / (steps.length - 1) : 0;

  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: steps[at], min: 0, max: steps.length - 1, now: at }}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.rail, { backgroundColor: colour }]} />
        {/* Inset by half a knob at each end, so the knob's travel is the length
            of the line it sits on and neither end hangs off it. */}
        <View style={styles.knobTravel} pointerEvents="none">
          <View
            style={[
              styles.knob,
              { backgroundColor: colour, left: `${along * 100}%`, marginLeft: -KNOB / 2 },
            ]}
          />
        </View>
        {/* One tap zone per stop, laid over the line. */}
        <View style={styles.zones}>
          {steps.map((step, zone) => (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${step}`}
              accessibilityState={{ selected: zone === at }}
              onPress={() => onChange(zone)}
              style={styles.zone}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * A setting with a handful of named values and no order worth showing: its
 * name, then the value it is on. Tapping moves to the next and wraps round.
 *
 * The value is drawn in the colour it names, which on the only one of these —
 * the accent — makes the swatch and the label the same thing.
 */
export function CycleRow({
  label,
  value,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  accent?: string;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityHint="Changes to the next one"
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.label, styles.value, { color: accent ?? palette.accent }]}>{value}</Text>
    </Pressable>
  );
}

/**
 * Something the screen does rather than something it holds: a word on its own,
 * set the way the difficulties are on the setup screen.
 */
export function ActionRow({
  label,
  accent,
  onPress,
}: {
  label: string;
  accent?: string;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.label, { color: accent ?? palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      paddingVertical: space(2),
    },
    action: {
      alignSelf: 'flex-start',
      paddingVertical: space(2),
      paddingRight: space(6),
    },
    label: {
      fontSize: 28,
      lineHeight: 38,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: palette.ink,
    },
    value: {
      // Pushed to the right-hand end of the row, where the slider's line ends.
      flex: 1,
      textAlign: 'right',
      marginRight: space(2),
    },
    box: {
      width: 26,
      height: 26,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tick: {
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 18,
    },
    track: {
      flex: 1,
      height: KNOB,
      justifyContent: 'center',
      paddingHorizontal: KNOB / 2,
      marginRight: space(2),
    },
    rail: {
      height: 2,
    },
    knobTravel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: KNOB / 2,
      right: KNOB / 2,
    },
    knob: {
      position: 'absolute',
      top: 0,
      width: KNOB,
      height: KNOB,
      borderRadius: KNOB / 2,
    },
    zones: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      flexDirection: 'row',
      // Tall enough to hit without aiming, without moving the line.
      marginVertical: -space(3),
    },
    zone: {
      flex: 1,
    },
  });
