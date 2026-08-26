import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { byHand, markKey, setMark } from '../board';
import {
  appendGame,
  completedGameFrom,
  EMPTY_HISTORY,
  HISTORY_VERSION,
  isHistory,
  isSavedGame,
  reviveHistory,
  reviveMarks,
  reviveSavedGame,
  SAVE_VERSION,
  type CompletedGame,
  type SavedGame,
} from '../persistence';

const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[1], seed: 7 });

function savedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    version: SAVE_VERSION,
    puzzle,
    marks: setMark({}, { c1: 0, i1: 0, c2: 1, i2: 1 }, 'yes', { size: puzzle.size.items }),
    cluesSeen: [0, 2],
    clueIndex: 2,
    seconds: 42,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const completed = (overrides: Partial<CompletedGame> = {}): CompletedGame => ({
  ...completedGameFrom(puzzle, { seconds: 100, cluesUsed: 0, revealed: false, finishedAt: 1 }),
  ...overrides,
});

describe('isSavedGame', () => {
  it('accepts a game it just wrote', () => {
    expect(isSavedGame(JSON.parse(JSON.stringify(savedGame())))).toBe(true);
  });

  it('rejects junk and half-written data', () => {
    expect(isSavedGame(null)).toBe(false);
    expect(isSavedGame('{}')).toBe(false);
    expect(isSavedGame({})).toBe(false);
    expect(isSavedGame(savedGame({ puzzle: undefined as never }))).toBe(false);
    expect(isSavedGame(savedGame({ marks: undefined as never }))).toBe(false);
    expect(isSavedGame(savedGame({ cluesSeen: undefined as never }))).toBe(false);
    expect(isSavedGame(savedGame({ clueIndex: 'first' as never }))).toBe(false);
  });

  it('rejects a save from another version', () => {
    expect(isSavedGame(savedGame({ version: SAVE_VERSION + 1 }))).toBe(false);
  });

  it('rejects a puzzle whose solution no longer matches its size', () => {
    const broken = savedGame({ puzzle: { ...puzzle, solution: puzzle.solution.slice(1) } });
    expect(isSavedGame(broken)).toBe(false);
  });
});

describe('history', () => {
  it('round-trips through JSON', () => {
    const history = appendGame(EMPTY_HISTORY, completed());
    expect(isHistory(JSON.parse(JSON.stringify(history)))).toBe(true);
  });

  it('rejects a history from another version', () => {
    expect(isHistory({ version: HISTORY_VERSION + 1, games: [] })).toBe(false);
    expect(isHistory({ version: HISTORY_VERSION, games: [{ nope: true }] })).toBe(false);
  });

  it('keeps the newest games first and caps the list', () => {
    let history = EMPTY_HISTORY;
    for (let index = 0; index < 5; index++) {
      history = appendGame(history, completed({ finishedAt: index }), 3);
    }
    expect(history.games).toHaveLength(3);
    expect(history.games.map((game) => game.finishedAt)).toEqual([4, 3, 2]);
  });
});

describe('completedGameFrom', () => {
  it('captures what the statistics need', () => {
    const game = completedGameFrom(puzzle, {
      seconds: 61.6,
      cluesUsed: 2,
      revealed: false,
      finishedAt: 123,
    });
    expect(game).toMatchObject({
      seed: puzzle.seed,
      themeId: puzzle.themeId,
      sizeId: puzzle.size.id,
      clueCount: puzzle.clues.length,
      cluesUsed: 2,
      revealed: false,
      finishedAt: 123,
    });
    expect(game.seconds).toBe(62);
  });
});

describe('reading the finished games back', () => {
  it('leaves a game from before clues were counted without a count', () => {
    const { cluesUsed, ...older } = completed();
    const revived = reviveHistory({
      version: HISTORY_VERSION,
      games: [{ ...older, hintsUsed: 3 }],
    });

    // Hints and clues are not the same measure, so the old number is dropped
    // rather than read as a clue count — the game itself still counts.
    expect(revived?.games).toHaveLength(1);
    expect(revived?.games[0].cluesUsed).toBeNull();
  });

  it('keeps a count it does understand, and refuses another version', () => {
    const history = appendGame(EMPTY_HISTORY, completed({ cluesUsed: 4 }));
    expect(reviveHistory(JSON.parse(JSON.stringify(history)))?.games[0].cluesUsed).toBe(4);
    expect(reviveHistory({ version: HISTORY_VERSION + 1, games: [] })).toBeNull();
  });
});

describe('reading a board back', () => {
  const cell = { c1: 0, i1: 0, c2: 1, i2: 1 };

  it('keeps what each entry records', () => {
    const marks = setMark({}, cell, 'yes', { size: puzzle.size.items });
    expect(reviveMarks(JSON.parse(JSON.stringify(marks)))).toEqual(marks);
  });

  it("treats a board written before marks had a source as the player's own", () => {
    expect(reviveMarks({ '0.0-1.1': 'yes', '0.0-1.2': 'no' })).toEqual({
      '0.0-1.1': byHand('yes'),
      '0.0-1.2': byHand('no'),
    });
  });

  it('refuses a board with a square it cannot read', () => {
    expect(reviveMarks({ '0.0-1.1': 'maybe' })).toBeNull();
    expect(reviveMarks({ '0.0-1.1': { mark: 'yes' } })).toBeNull();
    expect(reviveMarks('nope')).toBeNull();
  });

  it('migrates an older save on the way in', () => {
    const legacy = { ...savedGame(), marks: { [markKey(cell)]: 'yes' } };
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(legacy)));
    expect(revived?.marks).toEqual({ [markKey(cell)]: byHand('yes') });
  });

  it('reads the clues a save from before the clue table had crossed off', () => {
    const { cluesSeen, clueIndex, ...older } = savedGame();
    const legacy = { ...older, crossedOut: [1, 3], hintsUsed: 2 };
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(legacy)));

    // The clues they had crossed off are the ones they had read.
    expect(revived?.cluesSeen).toEqual([1, 3]);
    expect(revived?.clueIndex).toBeNull();
  });

  it('refuses a save it cannot make sense of', () => {
    expect(reviveSavedGame(null)).toBeNull();
    expect(reviveSavedGame({ ...savedGame(), marks: { '0.0-1.1': 'maybe' } })).toBeNull();
    expect(reviveSavedGame({ ...savedGame(), version: SAVE_VERSION + 1 })).toBeNull();
  });
});
