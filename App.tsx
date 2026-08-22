import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SIZES, sizeById } from './src/data/sizes';
import { THEMES } from './src/data/themes';
import type { SavedGame } from './src/game/persistence';
import { usePersistence } from './src/game/usePersistence';
import { generatePuzzle } from './src/puzzle/generator';
import type { Puzzle, SizeOption } from './src/puzzle/types';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { palette } from './src/ui/theme';

type Screen = 'home' | 'game' | 'stats';

export default function App() {
  const persistence = usePersistence();

  const [size, setSize] = useState<SizeOption>(SIZES[1]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [restore, setRestore] = useState<SavedGame | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [busy, setBusy] = useState(false);

  /**
   * The theme is never chosen by the player: the generator draws one from the
   * pool, along with the sets and items it uses.
   *
   * Generation is synchronous and can take a beat on the bigger grids, so we
   * hand a frame back to the UI first and let the button show its busy state.
   */
  const build = useCallback(
    (nextSize: SizeOption) => {
      setBusy(true);
      setTimeout(() => {
        // Starting a new puzzle replaces whatever was in progress.
        persistence.discardSavedGame();
        setRestore(null);
        setPuzzle(generatePuzzle({ theme: THEMES, size: nextSize }));
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
            onNewPuzzle={() => build(size)}
            onSaveProgress={persistence.saveProgress}
            onCompleted={recordCompletion}
            onOpenStats={openStatsAfterWin}
          />
        ) : (
          <HomeScreen
            size={size}
            busy={busy}
            savedGame={persistence.savedGame}
            stats={persistence.stats}
            onSelectSize={setSize}
            onStart={() => build(size)}
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
