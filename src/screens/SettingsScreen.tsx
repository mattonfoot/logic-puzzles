import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VOLUMES, volumeStep, type Settings } from '../game/settings';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { RuledTitle } from '../ui/RuledTitle';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { space, type Palette } from '../ui/theme';

interface Props {
  settings: Settings;
  onChange: (change: Partial<Omit<Settings, 'version'>>) => void;
  onBack: () => void;
}

/**
 * Everything the player sets once and keeps: how much of the bookkeeping the
 * board does for them, which colours the app draws in, and what it sounds and
 * feels like. These outlive any one puzzle, which is why they are here rather
 * than in the game's own menu — though that menu reaches the board pair too,
 * since they are worth changing mid-puzzle.
 *
 * A list of names with a box or a slider against each, set at the size the rest
 * of the app sets a choice. There is nothing explaining what a setting does:
 * every one of them shows its effect the moment it is touched, and a paragraph
 * under each name turned six switches into a page to read.
 */
export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const auto = settings.colours === 'auto';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space(5) }]}
        showsVerticalScrollIndicator={false}
      >
        <RuledTitle>Settings</RuledTitle>

        <View style={styles.list}>
          <Check
            label="Automatic crosses"
            on={settings.autoEliminate}
            onPress={() => onChange({ autoEliminate: !settings.autoEliminate })}
          />
          <Check
            label="Auto add facts"
            on={settings.autoFacts}
            onPress={() => onChange({ autoFacts: !settings.autoFacts })}
          />
          <Check
            label="Match the device"
            on={auto}
            onPress={() =>
              onChange({ colours: auto ? (palette.scheme === 'night' ? 'night' : 'day') : 'auto' })
            }
          />
          <Check
            label="Night colours"
            on={palette.scheme === 'night'}
            // Shown as it stands, but the device is deciding it.
            disabled={auto}
            onPress={() => onChange({ colours: settings.colours === 'night' ? 'day' : 'night' })}
          />
          <Slider
            label="Volume"
            steps={VOLUMES.map((step) => step.label)}
            index={VOLUMES.findIndex((step) => step.value === volumeStep(settings.volume).value)}
            onChange={(index) => {
              onChange({ volume: VOLUMES[index].value });
              // Configured on the next render, so this plays at the volume being
              // left behind — which is the one the player just heard.
              feedback.tap();
            }}
          />
          <Check
            label="Vibration"
            on={settings.haptics}
            onPress={() => onChange({ haptics: !settings.haptics })}
          />
        </View>
      </ScrollView>

      <BackLink label="Back" onPress={onBack} />
    </View>
  );
}

/** A setting that is either on or off: a box, ticked or empty, and its name. */
function Check({
  label,
  on,
  disabled = false,
  onPress,
}: {
  label: string;
  on: boolean;
  /** Shown, but decided elsewhere. */
  disabled?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

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
        style={[
          styles.box,
          { borderColor: palette.accent, backgroundColor: on ? palette.accent : 'transparent' },
        ]}
      >
        {on ? <Text style={[styles.tick, { color: palette.bg }]}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

/**
 * A setting with a few settings between two ends: its name, then a line with
 * the knob sitting where it currently is.
 *
 * The steps are named rather than numbered, so the track is divided into as
 * many zones as there are and a tap lands on the nearest — no dragging, which
 * on a four-position control is more work than it is worth.
 */
function Slider({
  label,
  steps,
  index,
  onChange,
}: {
  label: string;
  steps: readonly string[];
  index: number;
  onChange: (index: number) => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const at = Math.max(0, index);
  // The knob's centre, as a share of the track: the first step sits on the
  // left-hand end and the last on the right-hand one.
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
        <View style={[styles.rail, { backgroundColor: palette.accent }]} />
        {/* Inset by half a knob at each end, so the knob's travel is the length
            of the line it sits on and neither end hangs off it. */}
        <View style={styles.knobTravel} pointerEvents="none">
          <View
            style={[
              styles.knob,
              { backgroundColor: palette.accent, left: `${along * 100}%`, marginLeft: -KNOB / 2 },
            ]}
          />
        </View>
        {/* One tap zone per step, laid over the line. */}
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

/** The knob's diameter, which the track is sized around. */
const KNOB = 16;

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
    list: {
      marginTop: space(4),
      gap: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      paddingVertical: space(2),
    },
    label: {
      fontSize: 28,
      lineHeight: 38,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: palette.ink,
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
