import { SIZES } from '../../data/sizes';
import { THEMES } from '../../data/themes';
import { generatePuzzle } from '../../puzzle/generator';
import { byHand, markKey, setMark } from '../board';
import {
  appendGame,
  completedGameFrom,
  EMPTY_HISTORY,
  EMPTY_WALKED,
  HISTORY_VERSION,
  isHistory,
  isSavedGame,
  reviveHistory,
  reviveMarks,
  reviveSavedGame,
  reviveWalked,
  SAVE_VERSION,
  SAVED_UNDO,
  WALKED_VERSION,
  withWalked,
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
    history: [],
    hintsAsked: 0,
    undos: 0,
    rewinds: 0,
    conflicted: false,
    startedAt: 1_699_999_000_000,
    resumed: false,
    seconds: 42,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const completed = (overrides: Partial<CompletedGame> = {}): CompletedGame => ({
  ...completedGameFrom(puzzle, {
    seconds: 100,
    cluesUsed: 0,
    hintsAsked: 0,
    undos: 0,
    rewinds: 0,
    conflicted: false,
    startedAt: 0,
    resumed: false,
    revealed: false,
    finishedAt: 1,
  }),
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
    expect(isSavedGame(savedGame({ history: undefined as never }))).toBe(false);
    expect(isSavedGame(savedGame({ history: ['yes'] as never }))).toBe(false);
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
      hintsAsked: 1,
      undos: 3,
      rewinds: 1,
      conflicted: true,
      startedAt: 100,
      resumed: true,
      revealed: false,
      finishedAt: 123,
    });
    expect(game).toMatchObject({
      seed: puzzle.seed,
      themeId: puzzle.themeId,
      sizeId: puzzle.size.id,
      cluesUsed: 2,
      // How the board was arrived at, beside how long it took: nothing reads
      // these yet, and a game finished today cannot be measured tomorrow.
      undos: 3,
      rewinds: 1,
      conflicted: true,
      startedAt: 100,
      resumed: true,
      revealed: false,
      finishedAt: 123,
    });
    expect(game.seconds).toBe(62);
  });
});

describe('the lessons walked', () => {
  /**
   * Written past the tutorial rather than by it. The screen never reads it
   * back, so a lesson still opens on an empty board however many times it has
   * been taken — this exists only so that "has this player ever been shown the
   * comparison clue" is answerable at all, which is the one thing about the
   * lessons that cannot be worked out later.
   */
  it('notes a lesson once, and keeps the day it was walked', () => {
    const once = withWalked(EMPTY_WALKED, 'deduction', 1000);
    expect(once.lessons).toEqual({ deduction: 1000 });
    // Walked again later: the record is the first time, and the object is not
    // even rebuilt.
    expect(withWalked(once, 'deduction', 2000)).toBe(once);
    expect(withWalked(once, 'grouped', 2000).lessons).toEqual({ deduction: 1000, grouped: 2000 });
  });

  it('reads a record back, and refuses one it does not understand', () => {
    const stored = withWalked(EMPTY_WALKED, 'vague', 1000);
    expect(reviveWalked(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    expect(
      reviveWalked({ version: WALKED_VERSION, lessons: { a: 1, b: 'never' } })?.lessons,
    ).toEqual({ a: 1 });
    expect(reviveWalked({ version: 99, lessons: {} })).toBeNull();
    expect(reviveWalked({ version: WALKED_VERSION })).toBeNull();
    expect(reviveWalked({ version: WALKED_VERSION, lessons: ['deduction'] })?.lessons).toEqual({});
    expect(reviveWalked('nothing')).toBeNull();
  });
});

describe('reading the finished games back', () => {
  /**
   * Measured or not measured, never guessed: a game finished before the app
   * counted undos is not a game solved without taking a mark back.
   */
  it('leaves a game from before the board was measured with nothing against it', () => {
    const { undos, rewinds, conflicted, startedAt, resumed, ...older } = completed();
    const revived = reviveHistory({ version: HISTORY_VERSION, games: [older] });
    expect(revived?.games[0]).toMatchObject({
      undos: null,
      rewinds: null,
      conflicted: null,
      startedAt: null,
      resumed: null,
    });

    const measured = reviveHistory(
      JSON.parse(JSON.stringify(appendGame(EMPTY_HISTORY, completed({ undos: 2 })))),
    );
    expect(measured?.games[0].undos).toBe(2);
    expect(measured?.games[0].conflicted).toBe(false);
  });

  it('leaves a game from before hints were counted without one either', () => {
    const { hintsAsked, ...older } = completed();
    const revived = reviveHistory({ version: HISTORY_VERSION, games: [older] });

    // Told apart from a real zero: a game that had no hint to ask for is not a
    // game that managed without one.
    expect(revived?.games[0].hintsAsked).toBeNull();
    expect(
      reviveHistory(JSON.parse(JSON.stringify(appendGame(EMPTY_HISTORY, completed()))))?.games[0]
        .hintsAsked,
    ).toBe(0);
  });

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

  it('calls a game from before the sizes had names by the shape it stored', () => {
    const { difficulty, ...older } = completed();
    const revived = reviveHistory({ version: HISTORY_VERSION, games: [older] });

    expect(revived?.games[0].difficulty).toBe(older.sizeLabel);
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

  /**
   * The old save's `hintsUsed` counted a feature that no longer exists, which
   * is why what replaced it has a different name. Reading one as the other
   * would put a number on somebody's summary that they never earned.
   */
  it("does not read an old save's hint count as the new one", () => {
    const { hintsAsked, ...older } = savedGame({ version: 1 });
    const revived = reviveSavedGame(JSON.parse(JSON.stringify({ ...older, hintsUsed: 2 })));
    expect(revived?.hintsAsked).toBe(0);
  });

  /**
   * The five things a board is now measured by ride with it, so putting a
   * puzzle down and picking it up does not wipe the tally — the same rule the
   * clock and the clues read already follow.
   */
  it('keeps how the board was arrived at across a save and a resume', () => {
    const before = savedGame({ undos: 3, rewinds: 1, conflicted: true, resumed: true });
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(before)));
    expect(revived).toMatchObject({
      undos: 3,
      rewinds: 1,
      conflicted: true,
      resumed: true,
      startedAt: before.startedAt,
    });
  });

  /**
   * A save from before any of it was measured comes forward at nothing — which
   * is what it had — except the start time, which is dated back from its clock.
   * That lands later than the truth rather than earlier, so a puzzle can only
   * look newer than it is, never older.
   */
  it('brings a save from before the board was measured forward at nothing', () => {
    const { undos, rewinds, conflicted, startedAt, resumed, ...older } = savedGame({ version: 3 });
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(older)));
    expect(revived?.version).toBe(SAVE_VERSION);
    expect(revived).toMatchObject({ undos: 0, rewinds: 0, conflicted: false, resumed: false });
    expect(revived?.startedAt).toBe(older.updatedAt - older.seconds * 1000);
  });

  it('keeps the hints asked for across a save and a resume', () => {
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(savedGame({ hintsAsked: 4 }))));
    expect(revived?.hintsAsked).toBe(4);
  });

  it('brings a save from before the undo stack was kept forward with an empty one', () => {
    const { history, ...older } = savedGame({ version: 1 });
    const revived = reviveSavedGame(JSON.parse(JSON.stringify(older)));
    expect(revived?.version).toBe(SAVE_VERSION);
    expect(revived?.history).toEqual([]);
    expect(revived?.marks).toEqual(older.marks);
  });

  it('keeps the undo stack, boards of every age, and only the last twenty', () => {
    const before = setMark({}, cell, 'no', { size: puzzle.size.items });
    const older = { [markKey(cell)]: 'yes' };
    const revived = reviveSavedGame(
      JSON.parse(JSON.stringify(savedGame({ history: [older as never, before] }))),
    );
    expect(revived?.history).toEqual([{ [markKey(cell)]: byHand('yes') }, before]);

    const long = Array.from({ length: 30 }, (_, index) => ({
      [markKey({ ...cell, i2: index % 3 })]: byHand('no'),
    }));
    expect(reviveSavedGame(savedGame({ history: long }))?.history).toEqual(long.slice(-SAVED_UNDO));
  });

  it('refuses a save whose undo stack it cannot read', () => {
    expect(reviveSavedGame(savedGame({ history: [{ '0.0-1.1': 'maybe' }] as never }))).toBeNull();
    expect(reviveSavedGame(savedGame({ history: 'none' as never }))).toBeNull();
  });

  it('refuses a save it cannot make sense of', () => {
    expect(reviveSavedGame(null)).toBeNull();
    expect(reviveSavedGame({ ...savedGame(), marks: { '0.0-1.1': 'maybe' } })).toBeNull();
    expect(reviveSavedGame({ ...savedGame(), version: SAVE_VERSION + 1 })).toBeNull();
  });
});
