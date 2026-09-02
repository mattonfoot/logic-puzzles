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

import { THEMES } from './src/data/themes';
import { dailySeed, looksDaily } from './src/game/library';
import type { CompletedGame, SavedGame } from './src/game/persistence';
import { usePersistence } from './src/game/usePersistence';
import { useSettings } from './src/game/useSettings';
import { generatePuzzle } from './src/puzzle/generator';
import type { Puzzle, SizeOption } from './src/puzzle/types';
import { DailyScreen } from './src/screens/DailyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { NumbersScreen } from './src/screens/NumbersScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { StartScreen } from './src/screens/StartScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { Boundary } from './src/ui/Boundary';
import { configureFeedback } from './src/ui/feedback';
import { ThemeProvider, useStyles, useTheme } from './src/ui/ThemeProvider';
import { inkOn, type Palette } from './src/ui/theme';

type Screen = 'start' | 'daily' | 'setup' | 'numbers' | 'result' | 'settings' | 'stats' | 'game';

/** The screens that wear `TitlePanel`, which is what the status bar reads off. */
const PANELLED = new Set<Screen>(['start', 'setup', 'numbers', 'daily']);

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
      <SafeAreaProvider>
        {/* Inside the providers, so the page it falls back to is drawn in the
            player's colours and clear of the notch; around the shell, so a
            throw anywhere the player can reach lands on that page rather than
            on a blank one. */}
        <Boundary>
          <Shell settings={settings} />
        </Boundary>
      </SafeAreaProvider>
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
  // The difficulty whose numbered list is open, and the finished game being
  // read back. Both are set on the way in and cleared by going back.
  const [chosen, setChosen] = useState<SizeOption | null>(null);
  const [result, setResult] = useState<CompletedGame | null>(null);
  // Where leaving a game returns to: the list it was started from.
  const [cameFrom, setCameFrom] = useState<Screen>('numbers');

  /**
   * Builds the puzzle a seed and a shape name, and opens it.
   *
   * Nothing is rolled here any more. A numbered game takes its number as the
   * seed and the daily challenge takes the date's, so every puzzle in the app
   * can be named and asked for again — and the seed still decides everything
   * the player is not choosing: the theme, the sets in play, the items in them,
   * the solution and the clues.
   *
   * Generation is synchronous and can take a beat on the bigger grids, so we
   * hand a frame back to the UI first and let the list show its busy state.
   */
  const build = useCallback(
    (nextSize: SizeOption, seed: number, from: Screen) => {
      setBusy(true);
      setTimeout(() => {
        // Starting a new puzzle replaces whatever was in progress.
        persistence.discardSavedGame();
        setRestore(null);
        setCameFrom(from);
        setPuzzle(generatePuzzle({ theme: THEMES, size: nextSize, seed }));
        setScreen('game');
        setBusy(false);
      }, 32);
    },
    [persistence],
  );

  const resume = useCallback(() => {
    const saved = persistence.savedGame;
    if (!saved) return;
    setRestore(saved);
    setPuzzle(saved.puzzle);
    setCameFrom('setup');
    setScreen('game');
  }, [persistence.savedGame]);

  const leaveGame = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen(cameFrom);
  }, [cameFrom]);

  const recordCompletion = useCallback(
    (input: Parameters<typeof persistence.recordCompletion>[1]) => {
      if (!puzzle) throw new Error('No puzzle in play');
      return persistence.recordCompletion(puzzle, input);
    },
    [persistence, puzzle],
  );

  return (
    <>
      {/* Every screen before a board runs a coloured panel up behind the status
          bar, so the clock has to lift off that rather than off the page — and
          which way round depends on the colour, the same way the words on the
          panel do. */}
      <StatusBar
        style={
          PANELLED.has(screen)
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
            // A game picked back up does not say which list it came from; its
            // seed does.
            daily={cameFrom === 'daily' || looksDaily(puzzle.seed)}
            onExit={leaveGame}
            onSaveProgress={persistence.saveProgress}
            onCompleted={recordCompletion}
          />
        ) : screen === 'setup' ? (
          <SetupScreen
            busy={busy}
            savedGame={persistence.savedGame}
            savedGameDamaged={persistence.savedGameDamaged}
            onChoose={(size) => {
              setChosen(size);
              setScreen('numbers');
            }}
            onResume={resume}
            onBack={() => setScreen('start')}
          />
        ) : screen === 'numbers' && chosen ? (
          <NumbersScreen
            size={chosen}
            busy={busy}
            history={persistence.history}
            onPlay={(number) => build(chosen, number, 'numbers')}
            onBack={() => setScreen('setup')}
          />
        ) : screen === 'daily' ? (
          <DailyScreen
            busy={busy}
            history={persistence.history}
            onPlay={(size) => build(size, dailySeed(), 'daily')}
            onShowResult={(game) => {
              setResult(game);
              setScreen('result');
            }}
            onBack={() => setScreen('start')}
          />
        ) : screen === 'result' && result ? (
          <ResultScreen game={result} onBack={() => setScreen('daily')} />
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
            historyDamaged={persistence.historyDamaged}
            onBack={() => setScreen(puzzle ? 'game' : 'start')}
            onClearHistory={persistence.clearHistory}
          />
        ) : (
          <StartScreen
            onDaily={() => setScreen('daily')}
            onPlay={() => setScreen('setup')}
            onOpenSettings={() => setScreen('settings')}
            onOpenStats={() => setScreen('stats')}
          />
        )}
      </View>
    </>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.bg,
    },
  });
