import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Settings } from '../game/settings';
import { haptics } from '../ui/haptics';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, joinTop, space, tint, type Palette } from '../ui/theme';

interface Props {
  settings: Settings;
  onChange: (change: Partial<Omit<Settings, 'version'>>) => void;
  onBack: () => void;
}

/**
 * Everything the player sets once and keeps: how much of the bookkeeping the
 * board does for them, and which colours the app draws in. These outlive any
 * one puzzle, which is why they are here rather than in the game's own menu —
 * though that menu reaches the board pair too, since they are worth changing
 * mid-puzzle.
 */
export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const auto = settings.colours === 'auto';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(8) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Board</Text>
        <Toggle
          label="Automatic crosses"
          note="A tick crosses out the rest of its row and column for you. Your own crosses stay either way."
          on={settings.autoEliminate}
          onPress={() => onChange({ autoEliminate: !settings.autoEliminate })}
        />
        <Toggle
          label="Auto add facts"
          note="A tick that follows from the ticks already down is filled in: if A goes with B and B goes with C, then A goes with C."
          on={settings.autoFacts}
          joined
          onPress={() => onChange({ autoFacts: !settings.autoFacts })}
        />

        <Text style={styles.sectionLabel}>Colours</Text>
        <Toggle
          label="Match the device"
          note="Follow the phone's own light and dark setting, and turn with it."
          on={auto}
          onPress={() =>
            onChange({ colours: auto ? (palette.scheme === 'night' ? 'night' : 'day') : 'auto' })
          }
        />
        <Toggle
          label="Night colours"
          note={
            auto
              ? `Set by the device, which is asking for ${palette.scheme === 'night' ? 'night' : 'day'} right now.`
              : 'A warm near-black page, for reading in the dark.'
          }
          on={palette.scheme === 'night'}
          disabled={auto}
          joined
          onPress={() => onChange({ colours: settings.colours === 'night' ? 'day' : 'night' })}
        />
      </ScrollView>
    </View>
  );
}

function Toggle({
  label,
  note,
  on,
  joined,
  disabled = false,
  onPress,
}: {
  label: string;
  note: string;
  on: boolean;
  /** Share the top edge with the row before it. */
  joined?: boolean;
  /** Shown, but decided elsewhere. */
  disabled?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        joined && joinTop,
        { opacity: disabled ? 0.55 : pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <View
        style={[
          styles.switch,
          {
            borderColor: on ? palette.accent : palette.line,
            backgroundColor: on ? tint(palette.accent, 0.12) : palette.surfaceAlt,
          },
        ]}
      >
        <Text style={[styles.switchText, { color: on ? palette.accent : palette.inkFaint }]}>
          {on ? 'On' : 'Off'}
        </Text>
      </View>
    </Pressable>
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
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.inkFaint,
      marginTop: space(5),
      marginBottom: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      padding: space(4),
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.ink,
    },
    rowNote: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.inkSoft,
      marginTop: space(0.5),
    },
    switch: {
      minWidth: 46,
      paddingVertical: space(1),
      paddingHorizontal: space(2),
      borderWidth: border,
      alignItems: 'center',
    },
    switchText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
