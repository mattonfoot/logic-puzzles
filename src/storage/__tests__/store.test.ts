import AsyncStorage from '@react-native-async-storage/async-storage';

import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { byHand } from '../../game/board';
import { completedGameFrom, EMPTY_HISTORY, SAVE_VERSION, appendGame } from '../../game/persistence';
import { generatePuzzle } from '../../puzzle/generator';
import { storage, valueOf } from '../store';

const puzzle = generatePuzzle({ theme: THEMES[3], size: SIZES[0], seed: 11 });

const saved = {
  version: SAVE_VERSION,
  puzzle,
  marks: {
    '0.0-1.1': byHand('yes'),
    '0.0-1.2': { mark: 'no' as const, source: 'auto' as const, from: '0.0-1.1' },
  },
  cluesSeen: [1],
  clueIndex: 1,
  seconds: 30,
  updatedAt: 5,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage', () => {
  it('has nothing saved to begin with', async () => {
    expect(await storage.loadSavedGame()).toEqual({ kind: 'empty' });
    expect(await storage.loadHistory()).toEqual({ kind: 'empty' });
    expect(valueOf(await storage.loadHistory()) ?? EMPTY_HISTORY).toEqual(EMPTY_HISTORY);
  });

  it('brings a saved game back exactly as it went in', async () => {
    await expect(storage.saveGame(saved)).resolves.toBe(true);
    expect(valueOf(await storage.loadSavedGame())).toEqual(saved);

    await storage.clearSavedGame();
    expect(await storage.loadSavedGame()).toEqual({ kind: 'empty' });
  });

  it('brings the history back', async () => {
    const history = appendGame(
      EMPTY_HISTORY,
      completedGameFrom(puzzle, { seconds: 75, cluesUsed: 1, revealed: false, finishedAt: 9 }),
    );
    await storage.saveHistory(history);
    expect(valueOf(await storage.loadHistory())).toEqual(history);

    await storage.clearHistory();
    expect(await storage.loadHistory()).toEqual({ kind: 'empty' });
  });

  it('brings a board written before marks had a source forward', async () => {
    await AsyncStorage.setItem(
      'logic-grid:saved-game:v1',
      JSON.stringify({ ...saved, marks: { '0.0-1.1': 'yes' } }),
    );
    expect(valueOf(await storage.loadSavedGame())?.marks).toEqual({ '0.0-1.1': byHand('yes') });
  });

  /**
   * Nothing usable comes back from a damaged slot — but it is not called
   * empty. That is the difference between a fresh device and one where a
   * player's game is sitting unreadable, and the setup screen says which.
   */
  it('tells damaged data from nothing saved, and hands neither back', async () => {
    await AsyncStorage.setItem('logic-grid:saved-game:v1', 'not json');
    expect(await storage.loadSavedGame()).toEqual({ kind: 'damaged' });

    await AsyncStorage.setItem(
      'logic-grid:saved-game:v1',
      JSON.stringify({ ...saved, marks: { '0.0-1.1': 'maybe' } }),
    );
    expect(await storage.loadSavedGame()).toEqual({ kind: 'damaged' });
    expect(valueOf(await storage.loadSavedGame())).toBeNull();

    await AsyncStorage.setItem('logic-grid:history:v1', JSON.stringify({ version: 99, games: [] }));
    expect(await storage.loadHistory()).toEqual({ kind: 'damaged' });
  });

  it('survives a storage backend that throws, and says so', async () => {
    const failing = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('no disk'));
    // A backend that will not answer may be hiding a save; it is not "empty".
    expect(await storage.loadSavedGame()).toEqual({ kind: 'damaged' });
    failing.mockRestore();

    const failingWrite = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('full'));
    await expect(storage.saveGame(saved)).resolves.toBe(false);
    await expect(storage.saveHistory(EMPTY_HISTORY)).resolves.toBe(false);
    failingWrite.mockRestore();

    const failingRemove = jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValue(new Error('locked'));
    await expect(storage.clearSavedGame()).resolves.toBe(false);
    failingRemove.mockRestore();
  });
});
