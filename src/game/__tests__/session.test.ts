import { markKey, setMark, type Cell, type Marks } from '../board';
import { lessonById } from '../lessons';
import { SAVED_UNDO } from '../persistence';
import {
  completionOf,
  findRewind,
  saveOf,
  sessionReducer,
  startSession,
  UNDO_LIMIT,
  type Session,
  type SessionAction,
} from '../session';

const puzzle = lessonById('deduction').puzzle;
const options = { size: puzzle.size.items, autoEliminate: false };
const cell = (i1: number, i2: number): Cell => ({ c1: 0, i1, c2: 1, i2 });
const mark = (marks: Marks, at: Cell, kind: 'yes' | 'no') => setMark(marks, at, kind, options);

function play(session: Session, ...actions: SessionAction[]): Session {
  return actions.reduce(sessionReducer, session);
}
const fresh = () => startSession(null, 1000);
const move = (at: Cell, kind: 'yes' | 'no'): SessionAction => ({
  type: 'move',
  change: (marks) => mark(marks, at, kind),
});

describe('a session', () => {
  it('starts blank, or where a save left it', () => {
    expect(fresh()).toMatchObject({ attempt: 0, marks: {}, history: [], resumed: false });
    const saved = saveOf(
      play(fresh(), move(cell(0, 0), 'no'), { type: 'read', index: 1 }),
      puzzle,
      42,
    );
    const resumed = startSession(saved);
    expect(resumed.marks).toEqual(saved.marks);
    expect([...resumed.cluesSeen]).toEqual([1]);
    expect(resumed.resumed).toBe(true);
  });

  it('records a move so it can be taken back', () => {
    const after = play(fresh(), move(cell(0, 0), 'no'), move(cell(1, 1), 'no'));
    expect(after.history).toHaveLength(2);
    const undone = play(after, { type: 'undo', options });
    expect(undone.marks).toEqual(after.history[1]);
    expect(undone.history).toHaveLength(1);
    expect(undone.undos).toBe(1);
  });

  it('leaves itself alone for a move that changes nothing, or an undo with nothing to undo', () => {
    const start = fresh();
    expect(sessionReducer(start, { type: 'move', change: (marks) => marks })).toBe(start);
    expect(sessionReducer(start, { type: 'undo', options })).toBe(start);
  });

  it('remembers only so many moves back', () => {
    let session = fresh();
    for (let step = 0; step < UNDO_LIMIT + 5; step++) {
      session = sessionReducer(
        session,
        move(cell(step % 3, (step + 1) % 3), step % 2 ? 'yes' : 'no'),
      );
    }
    expect(session.history.length).toBeLessThanOrEqual(UNDO_LIMIT);
  });

  it('stops pointing at squares on the next move', () => {
    const pointed = play(fresh(), { type: 'point', keys: ['a', 'b'] });
    expect([...pointed.pointing]).toEqual(['a', 'b']);
    expect(play(pointed, move(cell(0, 0), 'no')).pointing.size).toBe(0);
  });

  it('counts a clue once however often it is read, and a written one as read', () => {
    const read = play(
      fresh(),
      { type: 'read', index: 2 },
      { type: 'read', index: 0 },
      { type: 'read', index: 2 },
      { type: 'turn', index: 0 },
    );
    expect([...read.cluesSeen]).toEqual([2, 0]);
    expect(read.clueIndex).toBe(0);
    const clue = puzzle.clues[0];
    const written = play(read, { type: 'write', clue, index: puzzle.clues.length });
    expect(written.extraClues).toEqual([clue]);
    expect(written.clueIndex).toBe(puzzle.clues.length);
    expect(written.cluesSeen.has(puzzle.clues.length)).toBe(true);
  });

  it('tallies hints and keeps a conflict once there has been one', () => {
    const after = play(fresh(), { type: 'hint', keys: ['x'] }, { type: 'conflicted' });
    expect(after.hintsAsked).toBe(1);
    expect([...after.pointing]).toEqual(['x']);
    expect(play(after, move(cell(0, 0), 'no')).conflicted).toBe(true);
  });

  it('starts over on the same puzzle', () => {
    const played = play(
      fresh(),
      move(cell(0, 0), 'no'),
      { type: 'read', index: 1 },
      { type: 'hint', keys: [] },
    );
    const again = play(played, { type: 'restart', now: 5000 });
    expect(again).toEqual({ ...startSession(null, 5000), attempt: 1 });
  });

  it('is saved and recorded with what it has counted', () => {
    const played = play(
      fresh(),
      move(cell(0, 0), 'no'),
      { type: 'read', index: 1 },
      { type: 'undo', options },
    );
    const saved = saveOf(played, puzzle, 30, 2000);
    expect(saved).toMatchObject({
      seconds: 30,
      updatedAt: 2000,
      cluesSeen: [1],
      undos: 1,
      startedAt: 1000,
    });
    expect(completionOf(played, 30)).toMatchObject({
      seconds: 30,
      cluesUsed: 1,
      undos: 1,
      revealed: false,
    });
  });

  it('keeps only the last few moves in a save', () => {
    let session = fresh();
    for (let step = 0; step < SAVED_UNDO + 5; step++) {
      session = sessionReducer(
        session,
        move(cell(step % 3, (step + 1) % 3), step % 2 ? 'yes' : 'no'),
      );
    }
    expect(saveOf(session, puzzle, 0).history).toHaveLength(SAVED_UNDO);
  });
});

describe('rewinding', () => {
  // Two ticks in one row: two marks that cannot both be true.
  const first = cell(0, 0);
  const second = cell(0, 1);

  it('walks back to the newest board the marks agree on', () => {
    const played = play(fresh(), move(first, 'yes'), move(second, 'yes'));
    const to = findRewind(played.history, puzzle, options);
    expect(to.board).toEqual(mark({}, first, 'yes'));
    expect(to.steps).toBe(1);
    const rewound = play(played, { type: 'rewind', to, puzzle, options });
    expect(rewound.marks).toEqual(to.board);
    expect(rewound.history).toEqual([{}]);
    expect(rewound.rewinds).toBe(1);
  });

  it('takes the bad marks off when nothing recorded is clean', () => {
    const session = { ...fresh(), marks: mark(mark({}, first, 'yes'), second, 'yes') };
    const to = findRewind([], puzzle, options);
    expect(to.board).toBeNull();
    const rewound = play(session, { type: 'rewind', to, puzzle, options });
    expect(rewound.marks[markKey(first)]).toBeUndefined();
    expect(rewound.marks[markKey(second)]).toBeUndefined();
  });
});
