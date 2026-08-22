import { sizeFor } from '../../data/sizes';
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
  reviveHistory,
  reviveSavedGame,
  SAVE_VERSION,
  type CompletedGame,
  type SavedGame,
} from '../persistence';

const puzzle = generatePuzzle({ theme: THEMES[0], size: sizeFor(4, 4), seed: 7 });

function savedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    version: SAVE_VERSION,
    puzzle,
    marks: setMark({}, { c1: 0, i1: 0, c2: 1, i2: 1 }, 'yes', { size: puzzle.size.items }),
    crossedOut: [0, 2],
    seconds: 42,
    hintsUsed: 1,
    activePair: 3,
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


describe('reading data written by an older build', () => {
  /** Version 1 stored one of four size presets, with `categories` for sets. */
  const legacySize = { id: 'md', items: 5, categories: 4, label: '5 × 4', blurb: 'Tricky' };
  const legacyPuzzle = generatePuzzle({ theme: THEMES[0], size: sizeFor(4, 5), seed: 21 });

  const legacySave = {
    ...savedGame({ puzzle: { ...legacyPuzzle, size: legacySize } as never }),
    version: 1,
  };

  it('brings a version 1 saved game forward with its shape rebuilt', () => {
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(legacySave)));
    expect(revived).not.toBeNull();
    expect(revived!.version).toBe(SAVE_VERSION);
    expect(revived!.puzzle.size).toMatchObject({
      id: '4x5',
      sets: 4,
      items: 5,
      label: '4 × 5',
      description: '4 sets of 5',
      grids: 6,
    });
    // The board itself is untouched.
    expect(revived!.marks).toEqual(legacySave.marks);
    expect(revived!.seconds).toBe(legacySave.seconds);
  });

  it('keeps version 1 statistics by mapping the old preset ids', () => {
    const legacyHistory = {
      version: 1,
      games: [
        { ...completed(), sizeId: 'md', sizeLabel: '5 × 4' },
        { ...completed(), sizeId: 'xs', sizeLabel: '3 × 3' },
      ],
    };
    const revived = reviveHistory(JSON.parse(JSON.stringify(legacyHistory)));

    expect(revived!.version).toBe(HISTORY_VERSION);
    expect(revived!.games.map((game) => [game.sizeId, game.sizeLabel])).toEqual([
      ['4x5', '4 × 5'],
      ['3x3', '3 × 3'],
    ]);
  });

  it('refuses anything from a version it does not know', () => {
    expect(reviveSavedGame({ ...legacySave, version: 99 })).toBeNull();
    expect(reviveHistory({ version: 99, games: [] })).toBeNull();
    expect(reviveSavedGame(null)).toBeNull();
    expect(reviveHistory('nope')).toBeNull();
  });

  it('drops a saved game whose shape cannot be worked out', () => {
    const broken = { ...legacySave, puzzle: { ...legacyPuzzle, size: { id: '???' } } };
    expect(reviveSavedGame(broken)).toBeNull();
  });

  it('passes a current saved game straight through', () => {
    const current = savedGame();
    expect(reviveSavedGame(JSON.parse(JSON.stringify(current)))).toEqual(current);
  });
});
