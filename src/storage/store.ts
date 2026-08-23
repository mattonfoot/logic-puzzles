/**
 * Everything that touches AsyncStorage lives here.
 *
 * Storage is best effort: a phone that refuses to read or write should cost the
 * player their saved game, never the app. Every call is wrapped, and reads run
 * through a guard so half-written or outdated data is treated as "nothing
 * saved" rather than crashing the game.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  EMPTY_HISTORY,
  isHistory,
  reviveSavedGame,
  type History,
  type SavedGame,
} from '../game/persistence';

const KEYS = {
  savedGame: 'logic-grid:saved-game:v1',
  history: 'logic-grid:history:v1',
} as const;

/** `revive` validates and, where a shape has moved on, migrates. */
async function readJson<T>(key: string, revive: (value: unknown) => T | null): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return revive(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Out of space or storage disabled — the game carries on regardless.
  }
}

async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignored
  }
}

export const storage = {
  loadSavedGame: () => readJson(KEYS.savedGame, reviveSavedGame),
  saveGame: (game: SavedGame) => writeJson(KEYS.savedGame, game),
  clearSavedGame: () => removeKey(KEYS.savedGame),

  loadHistory: async (): Promise<History> =>
    (await readJson(KEYS.history, (value) => (isHistory(value) ? value : null))) ?? EMPTY_HISTORY,
  saveHistory: (history: History) => writeJson(KEYS.history, history),
  clearHistory: () => removeKey(KEYS.history),
};
