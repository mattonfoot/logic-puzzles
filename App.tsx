import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_SIZE, ITEM_COUNTS, SET_COUNTS, sizeById, sizeFor } from './src/data/sizes';
import { THEMES, themeById } from './src/data/themes';
import type { SavedGame } from './src/game/persistence';
import { usePersistence } from './src/game/usePersistence';
import { generatePuzzle } from './src/puzzle/generator';
import type { Puzzle, SizeOption, ThemeDef } from './src/puzzle/types';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { palette } from './src/ui/theme';

type Screen = 'home' | 'game' | 'stats';

export default function App() {
  const persistence = usePersistence();

  const [theme, setTheme] = useState<ThemeDef>(THEMES[0]);
  const [size, setSize] = useState<SizeOption>(DEFAULT_SIZE);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [restore, setRestore] = useState<SavedGame | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [busy, setBusy] = useState(false);

  /**
   * Generation is synchronous and can take a beat on the bigger grids, so we
   * hand a frame back to the UI first and let the button show its busy state.
   */
  const build = useCallback(
    (nextTheme: ThemeDef, nextSize: SizeOption) => {
      setBusy(true);
      setTimeout(() => {
        // Starting a new puzzle replaces whatever was in progress.
        persistence.discardSavedGame();
        setRestore(null);
        setPuzzle(generatePuzzle({ theme: nextTheme, size: nextSize }));
        setScreen('game');
        setBusy(false);
      }, 32);
    },
    [persistence],
  );

  const surpriseMe = useCallback(() => {
    const nextTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const nextSize = sizeFor(
      SET_COUNTS[Math.floor(Math.random() * SET_COUNTS.length)],
      ITEM_COUNTS[Math.floor(Math.random() * ITEM_COUNTS.length)],
    );
    setTheme(nextTheme);
    setSize(nextSize);
    build(nextTheme, nextSize);
  }, [build]);

  const resume = useCallback(() => {
    const saved = persistence.savedGame;
    if (!saved) return;
    // Line the setup pickers up with the resumed game, so "new puzzle" from
    // inside it keeps the same theme and size.
    try {
      setTheme(themeById(saved.puzzle.themeId));
      setSize(sizeById(saved.puzzle.size.id));
    } catch {
      // A theme or size that no longer exists: the saved puzzle still plays.
    }
    setRestore(saved);
    setPuzzle(saved.puzzle);
    setScreen('game');
  }, [persistence.savedGame]);

  /** Called from the win overlay: the puzzle is finished, so back goes home. */
  const openStatsAfterWin = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen('stats');
  }, []);

  const leaveGame = useCallback(() => {
    setPuzzle(null);
    setRestore(null);
    setScreen('home');
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
      <StatusBar style="dark" />
      <View style={styles.root}>
        {screen === 'stats' ? (
          <StatsScreen
            stats={persistence.stats}
            history={persistence.history}
            onBack={() => setScreen(puzzle ? 'game' : 'home')}
            onClearHistory={persistence.clearHistory}
          />
        ) : screen === 'game' && puzzle ? (
          <GameScreen
            key={puzzle.seed}
            puzzle={puzzle}
            restore={restore ?? persistence.savedGame}
            onExit={leaveGame}
            onNewPuzzle={() => build(theme, size)}
            onSaveProgress={persistence.saveProgress}
            onCompleted={recordCompletion}
            onOpenStats={openStatsAfterWin}
          />
        ) : (
          <HomeScreen
            theme={theme}
            size={size}
            busy={busy}
            savedGame={persistence.savedGame}
            stats={persistence.stats}
            onSelectTheme={setTheme}
            onSelectSize={setSize}
            onStart={() => build(theme, size)}
            onSurpriseMe={surpriseMe}
            onResume={resume}
            onDiscardSaved={persistence.discardSavedGame}
            onOpenStats={() => setScreen('stats')}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
});
