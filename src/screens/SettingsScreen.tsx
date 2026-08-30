import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VOLUMES, volumeStep, type Settings } from '../game/settings';
import { t } from '../i18n';
import { BackLink } from '../ui/BackLink';
import { feedback } from '../ui/feedback';
import { accentById, nextAccent } from '../ui/accents';
import { RuledTitle } from '../ui/RuledTitle';
import { CheckRow, CycleRow, SliderRow } from '../ui/SettingRow';
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
 * since they are worth changing mid-puzzle, and sets them the same way.
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
        <RuledTitle>{t('settings.title')}</RuledTitle>

        <View style={styles.list}>
          <CheckRow
            label={t('settings.automaticCrosses')}
            on={settings.autoEliminate}
            onPress={() => onChange({ autoEliminate: !settings.autoEliminate })}
          />
          <CheckRow
            label={t('settings.autoAddFacts')}
            on={settings.autoFacts}
            onPress={() => onChange({ autoFacts: !settings.autoFacts })}
          />
          <CheckRow
            label={t('settings.matchDevice')}
            on={auto}
            onPress={() =>
              onChange({ colours: auto ? (palette.scheme === 'night' ? 'night' : 'day') : 'auto' })
            }
          />
          <CheckRow
            label={t('settings.nightColours')}
            on={palette.scheme === 'night'}
            // Shown as it stands, but the device is deciding it.
            disabled={auto}
            onPress={() => onChange({ colours: settings.colours === 'night' ? 'day' : 'night' })}
          />
          <CycleRow
            label={t('settings.colour')}
            value={accentById(settings.accent).name}
            onPress={() => onChange({ accent: nextAccent(settings.accent).id })}
          />
          <SliderRow
            label={t('settings.volume')}
            steps={VOLUMES.map((step) => step.label)}
            index={VOLUMES.findIndex((step) => step.value === volumeStep(settings.volume).value)}
            onChange={(index) => {
              onChange({ volume: VOLUMES[index].value });
              // Configured on the next render, so this plays at the volume being
              // left behind — which is the one the player just heard.
              feedback.tap();
            }}
          />
          <CheckRow
            label={t('settings.vibration')}
            on={settings.haptics}
            onPress={() => onChange({ haptics: !settings.haptics })}
          />
        </View>
      </ScrollView>

      <BackLink label={t('settings.back')} onPress={onBack} />
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
    list: {
      marginTop: space(4),
      gap: space(2),
    },
  });
