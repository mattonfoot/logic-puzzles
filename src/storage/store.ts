/**
 * Everything that touches AsyncStorage lives here.
 *
 * Storage is best effort: a phone that refuses to read or write should cost the
 * player their saved game, never the app. Every call is wrapped, and reads run
 * through a guard so half-written or outdated data is treated as "nothing
 * saved" rather than crashing the game.
 *
 * Best effort is not the same as silent. A write says whether it landed, and a
 * read tells a slot that is empty from one that holds something it cannot
 * use, so the screens can say so — once, quietly — rather than let a player
 * find out on the next launch that twenty minutes went nowhere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { reviveSettings, type Settings } from '../game/settings';
import {
  EMPTY_HISTORY,
  reviveHistory,
  reviveSavedGame,
  type History,
  type SavedGame,
} from '../game/persistence';

const KEYS = {
  savedGame: 'logic-grid:saved-game:v1',
  history: 'logic-grid:history:v1',
  settings: 'logic-grid:settings:v1',
} as const;

/**
 * What a read found.
 *
 * `empty` is the ordinary case on a fresh device. `damaged` is the one worth
 * telling somebody about: there *was* something under the key — a file that
 * would not parse, a shape the guards refused, or a backend that would not
 * answer at all — and it is being treated as nothing saved.
 */
export type Read<T> = { kind: 'ok'; value: T } | { kind: 'empty' } | { kind: 'damaged' };

/** `revive` validates and, where a shape has moved on, migrates. */
async function readJson<T>(key: string, revive: (value: unknown) => T | null): Promise<Read<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    // A backend that will not answer might be hiding a save; that is not the
    // same as knowing there is none.
    return { kind: 'damaged' };
  }
  if (!raw) return { kind: 'empty' };
  try {
    const value = revive(JSON.parse(raw) as unknown);
    return value === null ? { kind: 'damaged' } : { kind: 'ok', value };
  } catch {
    return { kind: 'damaged' };
  }
}

/** True if the write landed. */
async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Out of space or storage disabled — the game carries on regardless, and
    // the caller is told.
    return false;
  }
}

async function removeKey(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  loadSavedGame: () => readJson(KEYS.savedGame, reviveSavedGame),
  saveGame: (game: SavedGame) => writeJson(KEYS.savedGame, game),
  clearSavedGame: () => removeKey(KEYS.savedGame),

  loadHistory: () => readJson(KEYS.history, reviveHistory),
  saveHistory: (history: History) => writeJson(KEYS.history, history),
  clearHistory: () => removeKey(KEYS.history),

  loadSettings: () => readJson(KEYS.settings, reviveSettings),
  saveSettings: (settings: Settings) => writeJson(KEYS.settings, settings),
};

/** The value a read found, or nothing — for a caller that has no use for why. */
export function valueOf<T>(read: Read<T>): T | null {
  return read.kind === 'ok' ? read.value : null;
}
