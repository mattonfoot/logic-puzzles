import { render, type RenderResult } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SIZES, sizeById } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import type { CompletedGame, SavedGame } from '../../game/persistence';
import { DEFAULT_SETTINGS } from '../../game/settings';
import { generatePuzzle } from '../../puzzle/generator';
import type { Puzzle } from '../../puzzle/types';
import { summarise, type OverallStats } from '../../stats/summary';
import { ThemeProvider, type ColourPreference } from '../../ui/ThemeProvider';

/**
 * What every screen is mounted inside when the app runs, stood up the same way
 * here: the safe-area provider `App` wraps the shell in, given a phone's
 * metrics since there is no window to measure, and the theme provider with the
 * default colour and whichever scheme the test asks for.
 *
 * A screen rendered bare would throw on its first `useSafeAreaInsets`, which
 * is the right behaviour in the app and the wrong thing for a test to be
 * about.
 */
const PHONE = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function stage(
  ui: React.ReactElement,
  { scheme = 'day' as ColourPreference } = {},
): RenderResult {
  return render(
    <SafeAreaProvider initialMetrics={PHONE}>
      <ThemeProvider preference={scheme} accent={DEFAULT_SETTINGS.accent}>
        {ui}
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** A fixed moment, so "today" and "finished today" mean the same thing. */
export const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

/** The 4 × 4 puzzle numbered one — the one the screenshots open too. */
export function puzzleOne(sizeId = 'sm', seed = 1): Puzzle {
  return generatePuzzle({ theme: THEMES, size: sizeById(sizeId), seed });
}

export function game(overrides: Partial<CompletedGame> = {}): CompletedGame {
  return {
    seed: 1,
    themeId: 'cosmic',
    themeName: 'Cosmic Voyage',
    themeIcon: 'cosmic/theme',
    sizeId: 'sm',
    sizeLabel: '4 × 4',
    difficulty: 'Advanced',
    seconds: 120,
    cluesUsed: 4,
    revealed: false,
    finishedAt: NOON,
    ...overrides,
  };
}

/** A game left part-way through, as the setup screen would find it. */
export function savedGame(puzzle: Puzzle = puzzleOne()): SavedGame {
  return {
    version: 1,
    puzzle,
    marks: {},
    cluesSeen: [0],
    clueIndex: 0,
    seconds: 45,
    updatedAt: NOON,
  };
}

export function statsOf(games: CompletedGame[]): OverallStats {
  return summarise(games, SIZES, NOON);
}
