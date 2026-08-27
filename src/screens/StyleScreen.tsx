import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { ACCENTS, accentById } from '../ui/accents';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { RuledTitle } from '../ui/RuledTitle';
import { ActionRow, CheckRow, CycleRow, SliderRow } from '../ui/SettingRow';
import { Text } from '../ui/Text';
import { useStyles, useTheme } from '../ui/ThemeProvider';
import { border, paletteSwatches, shadow, space, tint, type Palette } from '../ui/theme';

interface Props {
  /** The colour in force, so the row for it can be marked. */
  accent: string;
  onChangeAccent: (accent: string) => void;
  /** Flipping this is the quickest way to see the other scheme's colours. */
  night: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

/**
 * Every colour and every piece the app is built from, on one page.
 *
 * The point of it is adjusting the palettes: a colour changed in
 * `src/ui/theme.ts` or `src/ui/accents.ts` shows up here against everything it
 * is used for, so it can be judged where it actually lands rather than as a hex
 * in a file. The swatch list comes from `paletteSwatches`, so a colour added to
 * `Palette` appears here without anyone having to remember to list it.
 *
 * The controls are live rather than pictures of controls — a disabled check
 * that renders at the wrong opacity is exactly the kind of thing a still would
 * hide. Their state is this screen's own and goes nowhere.
 */
export function StyleScreen({ accent, onChangeAccent, night, onToggleNight, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const palette = useTheme();
  const styles = useStyles(makeStyles);
  const [checked, setChecked] = useState(true);
  const [step, setStep] = useState(2);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space(5) }]}
        showsVerticalScrollIndicator={false}
      >
        <RuledTitle>Style</RuledTitle>
        <Text style={styles.subtitle}>
          {palette.scheme === 'night' ? 'Night' : 'Day'} colours · {accentById(accent).name}
        </Text>

        <Section title="The palette" />
        <Text style={styles.note}>
          Every role in `Palette`, as it stands in the scheme in force. Switch schemes to see the
          other set.
        </Text>
        <View style={styles.swatches}>
          {paletteSwatches(palette).map((swatch) => (
            <View key={swatch.role} style={styles.swatchRow}>
              <View style={[styles.chip, { backgroundColor: swatch.value }]} />
              <Text style={styles.swatchRole}>{swatch.role}</Text>
              <Text style={styles.swatchValue}>{swatch.value.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <Section title="The colours" />
        <Text style={styles.note}>
          Two cuts each: the day one carries white text and is what the title panel is painted in,
          the night one is light enough to read on a near-black page. Tap one to take it.
        </Text>
        <View style={styles.swatches}>
          {ACCENTS.map((one) => (
            <Pressable
              key={one.id}
              accessibilityRole="button"
              accessibilityLabel={one.name}
              accessibilityState={{ selected: one.id === accent }}
              onPress={() => {
                feedback.tap();
                onChangeAccent(one.id);
              }}
              style={({ pressed }) => [styles.swatchRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={[styles.chip, { backgroundColor: one.day }]} />
              <View style={[styles.chip, { backgroundColor: one.night }]} />
              <Text style={[styles.swatchRole, one.id === accent && styles.swatchRoleOn]}>
                {one.name}
                {one.id === accent ? ' ·' : ''}
              </Text>
              <Text style={styles.swatchValue}>
                {one.day.toUpperCase()} / {one.night.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Section title="Type" />
        <View style={styles.type}>
          <Text style={[styles.specimen, { fontSize: 64, lineHeight: 74, letterSpacing: -2 }]}>
            Deduction
          </Text>
          <Text style={styles.spec}>64 / 800 · the name on the panel</Text>
          <Text
            style={[
              styles.specimen,
              { fontSize: 56, lineHeight: 64, letterSpacing: -1, color: palette.accent },
            ]}
          >
            Play
          </Text>
          <Text style={styles.spec}>56 / 800 accent · the one thing to do</Text>
          <Text style={[styles.specimen, { fontSize: 28, letterSpacing: -0.6 }]}>Beginner</Text>
          <Text style={styles.spec}>28 / 800 · a choice, a setting, an action</Text>
          <Text style={[styles.specimen, { fontSize: 22, letterSpacing: -0.5 }]}>Statistics</Text>
          <Text style={styles.spec}>22 / 800 · a screen&rsquo;s name</Text>
          <Text style={[styles.body, { fontSize: 16, fontWeight: '600' }]}>
            Every puzzle is built when you ask for it.
          </Text>
          <Text style={styles.spec}>16 / 600 · the panel&rsquo;s paragraph</Text>
          <Text style={[styles.body, { fontSize: 14 }]}>
            The Lionfish spotter and the Sunken Pier site were on the same dive.
          </Text>
          <Text style={styles.spec}>14 / 400 · a clue, and most body text</Text>
          <Text style={styles.eyebrow}>Freshly generated</Text>
          <Text style={styles.spec}>12 / 700 · uppercase labels</Text>
        </View>

        <Section title="Controls" />
        <View style={styles.list}>
          <CheckRow label="Checked" on={checked} onPress={() => setChecked(!checked)} />
          <CheckRow label="Unchecked" on={!checked} onPress={() => setChecked(!checked)} />
          <CheckRow label="Decided elsewhere" on={false} disabled onPress={() => undefined} />
          <SliderRow
            label="Slider"
            steps={['Off', 'Quiet', 'Medium', 'Loud']}
            index={step}
            onChange={setStep}
          />
          <CycleRow label="Night" value={night ? 'On' : 'Off'} onPress={onToggleNight} />
          <ActionRow label="An action" onPress={() => feedback.tap()} />
          <ActionRow
            label="A dangerous one"
            accent={palette.danger}
            onPress={() => feedback.warn()}
          />
        </View>

        <Section title="Buttons" />
        <View style={styles.buttons}>
          <AppButton label="Solid" accent={palette.accent} onPress={() => feedback.tap()} />
          <AppButton
            label="Ghost"
            variant="ghost"
            accent={palette.inkSoft}
            onPress={() => feedback.tap()}
          />
          <AppButton label="Danger" accent={palette.danger} onPress={() => feedback.warn()} />
        </View>

        <Section title="Surfaces" />
        <View style={styles.surfaces}>
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>surface</Text>
            <Text style={styles.cardNote}>A card, with the card shadow and a line round it.</Text>
          </View>
          <View style={[styles.card, styles.cardAlt]}>
            <Text style={styles.cardTitle}>surfaceAlt</Text>
            <Text style={styles.cardNote}>The quieter one, for a row that is spent.</Text>
          </View>
          <View style={[styles.card, { backgroundColor: tint(palette.accent, 0.1) }]}>
            <Text style={[styles.cardTitle, { color: palette.accent }]}>tint(accent, 0.1)</Text>
            <Text style={styles.cardNote}>What a stat tile and a lit clue sit on.</Text>
          </View>
        </View>

        <Section title="The board" />
        <View style={styles.board}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.boardRow}>
              {[0, 1, 2, 3].map((column) => {
                const shaded = (row + column) % 2 === 1;
                const lit = row === 1;
                return (
                  <View
                    key={column}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: lit
                          ? tint(palette.accent, 0.16)
                          : shaded
                            ? palette.boardShade
                            : palette.boardLight,
                      },
                    ]}
                  >
                    {row === column ? (
                      <Text style={[styles.mark, { color: palette.accent }]}>✓</Text>
                    ) : row + column === 3 ? (
                      <Text style={[styles.mark, { color: tint(palette.accent, 0.55) }]}>✕</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          boardLight and boardShade, a tick in the accent and a cross at 55% of it, with a lit row
          on a 16% tint.
        </Text>

        <Section title="Meaning" />
        <View style={styles.list}>
          <Text style={[styles.meaning, { color: palette.success }]}>
            success · 20% faster lately
          </Text>
          <Text style={[styles.meaning, { color: palette.danger }]}>
            danger · 3 marks cannot be right
          </Text>
          <Text style={[styles.meaning, { color: palette.chart.series }]}>
            chart.series · the bars on the trend
          </Text>
          <Text style={[styles.meaning, { color: palette.inkFaint }]}>
            inkFaint · what a row says underneath
          </Text>
        </View>

        <Section title="Icons" />
        <View style={styles.icons}>
          {[
            'cosmic/theme',
            'quest/beast-griffin',
            'reef/species-octopus',
            'garden/flower-tulip',
          ].map((name) => (
            <View
              key={name}
              style={[styles.iconTile, { backgroundColor: tint(palette.accent, 0.1) }]}
            >
              <Icon name={name} size={34} color={palette.accent} />
            </View>
          ))}
          <View style={styles.iconTile}>
            <Icon name="ui/icon-clue" size={30} color={palette.ink} />
          </View>
          <View style={styles.iconTile}>
            <Icon name="ui/icon-chart" size={30} color={palette.inkFaint} />
          </View>
        </View>
      </ScrollView>

      <BackLink label="Back" onPress={onBack} />
    </View>
  );
}

function Section({ title }: { title: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <RuledTitle>{title}</RuledTitle>
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
    },
    subtitle: {
      fontSize: 12,
      color: palette.inkFaint,
      marginTop: space(1.5),
    },
    section: {
      marginTop: space(7),
      marginBottom: space(2),
    },
    note: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.inkSoft,
      marginBottom: space(3),
    },
    swatches: {
      borderTopWidth: border,
      borderTopColor: palette.line,
    },
    swatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      paddingVertical: space(2),
      borderBottomWidth: border,
      borderBottomColor: palette.line,
    },
    chip: {
      width: 30,
      height: 30,
      borderWidth: border,
      borderColor: palette.line,
    },
    swatchRole: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: palette.ink,
    },
    swatchRoleOn: {
      color: palette.accent,
    },
    swatchValue: {
      fontSize: 12,
      color: palette.inkFaint,
      fontVariant: ['tabular-nums'],
    },
    type: {
      gap: space(1),
    },
    specimen: {
      fontWeight: '800',
      color: palette.ink,
    },
    body: {
      color: palette.ink,
      lineHeight: 22,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.inkFaint,
    },
    spec: {
      fontSize: 11,
      color: palette.inkFaint,
      marginBottom: space(3),
    },
    list: {
      gap: space(1),
    },
    buttons: {
      gap: space(2),
    },
    surfaces: {
      gap: space(3),
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: border,
      borderColor: palette.line,
      padding: space(4),
    },
    cardAlt: {
      backgroundColor: palette.surfaceAlt,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.ink,
    },
    cardNote: {
      fontSize: 12,
      color: palette.inkSoft,
      marginTop: space(1),
    },
    board: {
      alignSelf: 'flex-start',
      borderWidth: border,
      borderColor: palette.lineStrong,
      marginBottom: space(3),
    },
    boardRow: {
      flexDirection: 'row',
    },
    cell: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.line,
    },
    mark: {
      fontSize: 17,
      fontWeight: '700',
    },
    meaning: {
      fontSize: 14,
      fontWeight: '600',
      paddingVertical: space(1),
    },
    icons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space(2),
    },
    iconTile: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: border,
      borderColor: palette.line,
    },
  });
