import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SIZES } from './src/data/sizes';
import { THEMES } from './src/data/themes';
import type { SavedGame } from './src/game/persistence';
import { usePersistence } from './src/game/usePersistence';
import { useSettings } from './src/game/useSettings';
import { generatePuzzle } from './src/puzzle/generator';
import { randomSeed } from './src/puzzle/rng';
import type { Puzzle, SizeOption } from './src/puzzle/types';
import { GameScreen } from './src/screens/GameScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { StartScreen } from './src/screens/StartScreen';
import { StyleScreen } from './src/screens/StyleScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { configureFeedback } from './src/ui/feedback';
import { ThemeProvider, useStyles, useTheme } from './src/ui/ThemeProvider';
import { inkOn, type Palette } from './src/ui/theme';

type Screen = 'start' | 'setup' | 'settings' | 'style' | 'stats' | 'game';

export default function App() {
  // One file per weight; `src/ui/Text` picks between them. Until they are here
  // the app draws in the system font, which reflows the moment they arrive, so
  // it waits on the empty page instead.
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });
  const settings = useSettings();

  // The effects fire from event handlers all over the app, so they read their
  // settings from a module rather than a context; this keeps that in step.
  useEffect(() => {
    configureFeedback({
      haptics: settings.settings.haptics,
      volume: settings.settings.volume,
    });
  }, [settings.settings.haptics, settings.settings.volume]);

  if (!fontsLoaded || !settings.ready) {
    return <Loading preference={settings.settings.colours} accent={settings.settings.accent} />;
  }

  return (
    <ThemeProvider preference={settings.settings.colours} accent={settings.settings.accent}>
      <Shell settings={settings} />
    </ThemeProvider>
  );
}

/** The empty page shown while the fonts and settings are read. */
function Loading({ preference, accent }: { preference: 'day' | 'night' | 'auto'; accent: string }) {
  return (
    <ThemeProvider preference={preference} accent={accent}>
      <Ground />
    </ThemeProvider>
  );
}

function Ground() {
  const styles = useStyles(makeStyles);
  return <View style={styles.root} />;
}

function Shell({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const persistence = usePersistence();
  const palette = useTheme();
  const styles = useStyles(makeStyles);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [restore, setRestore] = useState<SavedGame | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const [busy, setBusy] = useState(false);

  /**
   * Every new puzzle gets its own random seed, and that seed decides everything
   * the player is not choosing: the theme, the sets in play, the items in them,
   * the solution and the clues. Resuming or restarting keeps the puzzle that
   * seed produced, so the same cast comes back.
   *
   * Generation is synchronous and can take a beat on the bigger grids, so we
   * hand a frame back to the UI first and let the button show its busy state.
   */
  const build = useCallback(
    (nextSize: SizeOption) => {
      setBusy(true);
      const seed = randomSeed();
      setTimeout(() => {
        // Starting a new puzzle replaces whatever was in progress.
        persistence.discardSavedGame();
        setRestore(null);
        setPuzzle(generatePuzzle({ theme: THEMES, size: nextSize, seed }));
        setScreen('game');
        setBusy(false);
      }, 32);
    },
    [persistence],
  );

  const surpriseMe = useCallback(() => {
    build(SIZES[Math.floor(Math.random() * SIZES.length)]);
  }, [build]);

  const resume = useCallback(() => {
    const saved = persistence.savedGame;
    if (!saved) return;
    setRestore(saved);
    setPuzzle(saved.puzzle);
    setScreen('game');
  }, [persistence.savedGame]);

  const leaveGame = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen('setup');
  }, []);

  const recordCompletion = useCallback(
    (input: Parameters<typeof persistence.recordCompletion>[1]) => {
      if (!puzzle) throw new Error('No puzzle in play');
      return persistence.recordCompletion(puzzle, input);
    },
    [persistence, puzzle],
  );

  return (
    <SafeAreaProvider>
      {/* Two screens run a coloured panel up behind the status bar, so the clock
          has to lift off that rather than off the page — and which way round
          depends on the colour, the same way the words on the panel do. */}
      <StatusBar
        style={
          screen === 'start' || screen === 'setup'
            ? inkOn(palette.accentGround, '#FFFFFF', palette.ink) === '#FFFFFF'
              ? 'light'
              : 'dark'
            : palette.scheme === 'night'
              ? 'light'
              : 'dark'
        }
      />
      <View style={styles.root}>
        {screen === 'game' && puzzle ? (
          <GameScreen
            key={puzzle.seed}
            puzzle={puzzle}
            autoEliminate={settings.settings.autoEliminate}
            autoFacts={settings.settings.autoFacts}
            accent={settings.settings.accent}
            onToggleAutoEliminate={() =>
              settings.update({ autoEliminate: !settings.settings.autoEliminate })
            }
            onToggleAutoFacts={() => settings.update({ autoFacts: !settings.settings.autoFacts })}
            onChangeAccent={(accent) => settings.update({ accent })}
            restore={restore ?? persistence.savedGame}
            onExit={leaveGame}
            onSaveProgress={persistence.saveProgress}
            onCompleted={recordCompletion}
          />
        ) : screen === 'setup' ? (
          <SetupScreen
            busy={busy}
            savedGame={persistence.savedGame}
            onStart={build}
            onSurpriseMe={surpriseMe}
            onResume={resume}
            onDiscardSaved={persistence.discardSavedGame}
            onBack={() => setScreen('start')}
          />
        ) : screen === 'settings' ? (
          <SettingsScreen
            settings={settings.settings}
            onChange={settings.update}
            onOpenStyle={() => setScreen('style')}
            onBack={() => setScreen(puzzle ? 'game' : 'start')}
          />
        ) : screen === 'style' ? (
          <StyleScreen
            accent={settings.settings.accent}
            onChangeAccent={(accent) => settings.update({ accent })}
            night={palette.scheme === 'night'}
            onToggleNight={() =>
              settings.update({ colours: palette.scheme === 'night' ? 'day' : 'night' })
            }
            onBack={() => setScreen('settings')}
          />
        ) : screen === 'stats' ? (
          <StatsScreen
            stats={persistence.stats}
            history={persistence.history}
            onBack={() => setScreen(puzzle ? 'game' : 'start')}
            onClearHistory={persistence.clearHistory}
          />
        ) : (
          <StartScreen
            onPlay={() => setScreen('setup')}
            onOpenSettings={() => setScreen('settings')}
            onOpenStats={() => setScreen('stats')}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.bg,
    },
  });
