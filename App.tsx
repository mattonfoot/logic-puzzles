import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SIZES } from './src/data/sizes';
import { THEMES } from './src/data/themes';
import { generatePuzzle } from './src/puzzle/generator';
import type { Puzzle, SizeOption, ThemeDef } from './src/puzzle/types';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { palette } from './src/ui/theme';

export default function App() {
  const [theme, setTheme] = useState<ThemeDef>(THEMES[0]);
  const [size, setSize] = useState<SizeOption>(SIZES[1]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Generation is synchronous and can take a beat on the bigger grids, so we
   * hand a frame back to the UI first and let the button show its busy state.
   */
  const build = useCallback((nextTheme: ThemeDef, nextSize: SizeOption) => {
    setBusy(true);
    setTimeout(() => {
      setPuzzle(generatePuzzle({ theme: nextTheme, size: nextSize }));
      setBusy(false);
    }, 32);
  }, []);

  const surpriseMe = useCallback(() => {
    const nextTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const nextSize = SIZES[Math.floor(Math.random() * SIZES.length)];
    setTheme(nextTheme);
    setSize(nextSize);
    build(nextTheme, nextSize);
  }, [build]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        {puzzle ? (
          <GameScreen
            puzzle={puzzle}
            onExit={() => setPuzzle(null)}
            onNewPuzzle={() => build(theme, size)}
          />
        ) : (
          <HomeScreen
            theme={theme}
            size={size}
            busy={busy}
            onSelectTheme={setTheme}
            onSelectSize={setSize}
            onStart={() => build(theme, size)}
            onSurpriseMe={surpriseMe}
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
