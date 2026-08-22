import AsyncStorage from '@react-native-async-storage/async-storage';

import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { completedGameFrom, EMPTY_HISTORY, SAVE_VERSION, appendGame } from '../../game/persistence';
import { generatePuzzle } from '../../puzzle/generator';
import { storage } from '../store';

const puzzle = generatePuzzle({ theme: THEMES[3], size: SIZES[0], seed: 11 });

const saved = {
  version: SAVE_VERSION,
  puzzle,
  marks: { '0.0-1.1': 'yes' as const },
  crossedOut: [1],
  seconds: 30,
  hintsUsed: 0,
  activePair: 0,
  updatedAt: 5,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage', () => {
  it('has nothing saved to begin with', async () => {
    expect(await storage.loadSavedGame()).toBeNull();
    expect(await storage.loadHistory()).toEqual(EMPTY_HISTORY);
  });

  it('brings a saved game back exactly as it went in', async () => {
    await storage.saveGame(saved);
    expect(await storage.loadSavedGame()).toEqual(saved);

    await storage.clearSavedGame();
    expect(await storage.loadSavedGame()).toBeNull();
  });

  it('brings the history back', async () => {
    const history = appendGame(
      EMPTY_HISTORY,
      completedGameFrom(puzzle, { seconds: 75, hintsUsed: 1, revealed: false, finishedAt: 9 }),
    );
    await storage.saveHistory(history);
    expect(await storage.loadHistory()).toEqual(history);

    await storage.clearHistory();
    expect(await storage.loadHistory()).toEqual(EMPTY_HISTORY);
  });

  it('treats damaged data as nothing saved', async () => {
    await AsyncStorage.setItem('logic-grid:saved-game:v1', 'not json');
    expect(await storage.loadSavedGame()).toBeNull();

    await AsyncStorage.setItem('logic-grid:history:v1', JSON.stringify({ version: 99, games: [] }));
    expect(await storage.loadHistory()).toEqual(EMPTY_HISTORY);
  });

  it('survives a storage backend that throws', async () => {
    const failing = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('no disk'));
    expect(await storage.loadSavedGame()).toBeNull();
    failing.mockRestore();

    const failingWrite = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('full'));
    await expect(storage.saveGame(saved)).resolves.toBeUndefined();
    failingWrite.mockRestore();
  });
});
