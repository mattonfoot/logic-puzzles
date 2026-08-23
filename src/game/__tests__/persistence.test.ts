import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { setMark } from '../board';
import {
  appendGame,
  completedGameFrom,
  EMPTY_HISTORY,
  HISTORY_VERSION,
  isHistory,
  isSavedGame,
  SAVE_VERSION,
  type CompletedGame,
  type SavedGame,
} from '../persistence';

const puzzle = generatePuzzle({ theme: THEMES[0], size: SIZES[1], seed: 7 });

function savedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    version: SAVE_VERSION,
    puzzle,
    marks: setMark({}, { c1: 0, i1: 0, c2: 1, i2: 1 }, 'yes'),
    crossedOut: [0, 2],
    seconds: 42,
    hintsUsed: 1,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const completed = (overrides: Partial<CompletedGame> = {}): CompletedGame =>
  completedGameFrom(puzzle, { seconds: 100, hintsUsed: 0, revealed: false, finishedAt: 1, ...overrides });

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
    expect(isSavedGame(savedGame({ crossedOut: undefined as never }))).toBe(false);
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
      hintsUsed: 2,
      revealed: false,
      finishedAt: 123,
    });
    expect(game).toMatchObject({
      seed: puzzle.seed,
      themeId: puzzle.themeId,
      sizeId: puzzle.size.id,
      clueCount: puzzle.clues.length,
      hintsUsed: 2,
      revealed: false,
      finishedAt: 123,
    });
    expect(game.seconds).toBe(62);
  });
});
