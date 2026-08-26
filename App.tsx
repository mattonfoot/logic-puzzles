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

import { SIZES, sizeById } from './src/data/sizes';
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
import { StatsScreen } from './src/screens/StatsScreen';
import { configureFeedback } from './src/ui/feedback';
import { ThemeProvider, useStyles, useTheme } from './src/ui/ThemeProvider';
import type { Palette } from './src/ui/theme';

type Screen = 'start' | 'setup' | 'settings' | 'stats' | 'game';

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

  if (!fontsLoaded || !settings.ready) return <Loading preference={settings.settings.colours} />;

  return (
    <ThemeProvider preference={settings.settings.colours}>
      <Shell settings={settings} />
    </ThemeProvider>
  );
}

/** The empty page shown while the fonts and settings are read. */
function Loading({ preference }: { preference: 'day' | 'night' | 'auto' }) {
  return (
    <ThemeProvider preference={preference}>
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

  const [size, setSize] = useState<SizeOption>(SIZES[1]);
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
    const nextSize = SIZES[Math.floor(Math.random() * SIZES.length)];
    setSize(nextSize);
    build(nextSize);
  }, [build]);

  const resume = useCallback(() => {
    const saved = persistence.savedGame;
    if (!saved) return;
    // Line the size picker up with the resumed game, so "new puzzle" from
    // inside it keeps the same shape.
    try {
      setSize(sizeById(saved.puzzle.size.id));
    } catch {
      // A size that no longer exists: the saved puzzle still plays.
    }
    setRestore(saved);
    setPuzzle(saved.puzzle);
    setScreen('game');
  }, [persistence.savedGame]);

  /** Called from the solved tab: the puzzle is finished, so back goes home. */
  const openStatsAfterWin = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen('stats');
  }, []);

  const leaveGame = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen('start');
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
      <StatusBar style={palette.scheme === 'night' ? 'light' : 'dark'} />
      <View style={styles.root}>
        {screen === 'game' && puzzle ? (
          <GameScreen
            key={puzzle.seed}
            puzzle={puzzle}
            autoEliminate={settings.settings.autoEliminate}
            autoFacts={settings.settings.autoFacts}
            onToggleAutoEliminate={() =>
              settings.update({ autoEliminate: !settings.settings.autoEliminate })
            }
            onToggleAutoFacts={() => settings.update({ autoFacts: !settings.settings.autoFacts })}
            restore={restore ?? persistence.savedGame}
            onExit={leaveGame}
            onNewPuzzle={() => build(size)}
            onSaveProgress={persistence.saveProgress}
            onCompleted={recordCompletion}
            onOpenStats={openStatsAfterWin}
          />
        ) : screen === 'setup' ? (
          <SetupScreen
            busy={busy}
            stats={persistence.stats}
            onStart={(chosen) => {
              // Remembered so "new puzzle" from inside the game keeps the shape.
              setSize(chosen);
              build(chosen);
            }}
            onSurpriseMe={surpriseMe}
            onBack={() => setScreen('start')}
          />
        ) : screen === 'settings' ? (
          <SettingsScreen
            settings={settings.settings}
            onChange={settings.update}
            onBack={() => setScreen(puzzle ? 'game' : 'start')}
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
            savedGame={persistence.savedGame}
            stats={persistence.stats}
            onPlay={() => setScreen('setup')}
            onOpenSettings={() => setScreen('settings')}
            onOpenStats={() => setScreen('stats')}
            onResume={resume}
            onDiscardSaved={persistence.discardSavedGame}
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
