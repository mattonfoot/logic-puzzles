import { achievementsFor, ACHIEVEMENT_ICONS } from '../achievements';
import { dailySeed, numberedSeed } from '../library';
import type { ModeId } from '../modes';
import type { CompletedGame } from '../persistence';

const DAY = 86_400_000;
/** Noon, so a day either side of a game is still the day either side. */
const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

function game(overrides: Partial<CompletedGame> = {}): CompletedGame {
  return {
    seed: numberedSeed(1, 'sm', 'pure'),
    themeId: 'cosmic',
    themeName: 'Cosmic Voyage',
    themeIcon: 'cosmic/theme',
    sizeId: 'sm',
    sizeLabel: '4 × 4',
    difficulty: 'Advanced',
    seconds: 400,
    cluesUsed: 4,
    hintsAsked: 1,
    undos: 1,
    rewinds: 0,
    conflicted: true,
    startedAt: NOON - 400_000,
    resumed: false,
    revealed: false,
    finishedAt: NOON,
    ...overrides,
  };
}

/** A numbered game, played the way and at the size given. */
function played(
  mode: ModeId,
  sizeId: string,
  number: number,
  overrides: Partial<CompletedGame> = {},
): CompletedGame {
  return game({ sizeId, seed: numberedSeed(number, sizeId, mode), ...overrides });
}

/** History is stored newest first, which is how the walk is handed it. */
const newestFirst = (...games: CompletedGame[]): CompletedGame[] => [...games].reverse();

const ids = (games: CompletedGame[], lessons: Record<string, number> = {}) =>
  achievementsFor(games, lessons).map((earned) => earned.id);

describe('what has been earned', () => {
  it('gives nothing at all for a history with nothing in it', () => {
    expect(achievementsFor([])).toEqual([]);
  });

  /**
   * The counting ladder, which is most of them: everything, this kind of game,
   * and this kind at this difficulty. A difficulty never counts on its own — an
   * Expert board the hard way is not the same game as an Expert board with the
   * bookkeeping done — so there is no `size.md` here and there should not be.
   */
  it('counts a first puzzle three ways at once', () => {
    // Slow on purpose, so nothing but the counting cards is in the way.
    const earned = achievementsFor([played('classic', 'md', 1, { seconds: 1200 })]);
    expect(earned.map((one) => one.id)).toEqual(['all.1', 'kind.classic.1', 'pair.classic.md.1']);
    expect(earned.map((one) => one.title)).toEqual([
      'First puzzle',
      'First classic game',
      'First Classic Expert puzzle',
    ]);
    expect(earned[2].description).toBe('Expert boards, played Classic.');
  });

  it('hands over the hat trick, the ten and the century as the count reaches them', () => {
    const many = (count: number) =>
      ids(
        newestFirst(
          ...Array.from({ length: count }, (_, index) =>
            played('pure', 'sm', index + 1, { finishedAt: NOON + index * 1000 }),
          ),
        ),
      );
    expect(many(2)).toEqual(expect.arrayContaining(['all.1']));
    expect(many(2)).not.toEqual(expect.arrayContaining(['all.3']));
    expect(many(3)).toEqual(expect.arrayContaining(['all.3', 'kind.pure.3', 'pair.pure.sm.3']));
    expect(many(10)).toEqual(expect.arrayContaining(['all.10', 'pair.pure.sm.10']));
    expect(many(10)).not.toEqual(expect.arrayContaining(['all.100']));
  });

  /**
   * A card is dated by the game that earned it, which is the whole reason the
   * history is walked oldest first: the hat trick happened on the day the third
   * game was finished, not today.
   */
  it('dates each one by the game that earned it, newest first', () => {
    const earned = achievementsFor(
      newestFirst(
        played('pure', 'sm', 1, { finishedAt: NOON }),
        played('pure', 'sm', 2, { finishedAt: NOON + DAY }),
        played('pure', 'sm', 3, { finishedAt: NOON + 2 * DAY }),
      ),
    );
    expect(earned.find((one) => one.id === 'all.1')?.earnedAt).toBe(NOON);
    expect(earned.find((one) => one.id === 'all.3')?.earnedAt).toBe(NOON + 2 * DAY);
    // Newest first, so the third one is at the front.
    expect(earned[0].earnedAt).toBeGreaterThanOrEqual(earned[earned.length - 1].earnedAt);
  });

  it('leaves a revealed game out of everything', () => {
    expect(achievementsFor([game({ revealed: true })])).toEqual([]);
  });

  it('counts days running, and says nothing for the same day twice', () => {
    const onDays = (...days: number[]) =>
      ids(newestFirst(...days.map((day) => game({ finishedAt: NOON + day * DAY }))));
    expect(onDays(0, 0, 0)).not.toEqual(expect.arrayContaining(['streak.3']));
    expect(onDays(0, 1, 2)).toEqual(expect.arrayContaining(['streak.3']));
    expect(onDays(0, 1, 3)).not.toEqual(expect.arrayContaining(['streak.3']));
    expect(onDays(0, 1, 2, 3, 4, 5, 6)).toEqual(expect.arrayContaining(['streak.7']));
  });

  it('welcomes somebody back after a week away', () => {
    expect(
      ids(newestFirst(game({ finishedAt: NOON }), game({ finishedAt: NOON + 3 * DAY }))),
    ).not.toEqual(expect.arrayContaining(['back']));
    expect(
      ids(newestFirst(game({ finishedAt: NOON }), game({ finishedAt: NOON + 8 * DAY }))),
    ).toEqual(expect.arrayContaining(['back']));
  });

  it('sweeps a day when all five of its challenges are done', () => {
    const day = new Date(2026, 7, 20);
    const dailies = ['xs', 'sm', 'md', 'lg', 'xl'].map((sizeId) =>
      game({ sizeId, seed: dailySeed(day, sizeId), finishedAt: NOON }),
    );
    expect(ids(newestFirst(...dailies.slice(0, 4)))).not.toEqual(expect.arrayContaining(['sweep']));
    expect(ids(newestFirst(...dailies))).toEqual(expect.arrayContaining(['sweep']));
  });

  it('climbs the ladder once per way of playing', () => {
    const five = (mode: ModeId) =>
      ['xs', 'sm', 'md', 'lg', 'xl'].map((sizeId, index) =>
        played(mode, sizeId, 1, { finishedAt: NOON + index * DAY }),
      );
    expect(ids(newestFirst(...five('pure')))).toEqual(expect.arrayContaining(['ladder.pure']));
    expect(ids(newestFirst(...five('pure')))).not.toEqual(
      expect.arrayContaining(['ladder.classic', 'ladder.day']),
    );
    expect(ids(newestFirst(...five('classic')))).toEqual(
      expect.arrayContaining(['ladder.classic']),
    );
  });

  it('notices the whole ladder inside one day, and all three kinds in one', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    const inOneDay = sizes.map((sizeId) => played('pure', sizeId, 1, { finishedAt: NOON }));
    expect(ids(newestFirst(...inOneDay))).toEqual(expect.arrayContaining(['ladder.day']));

    const threeKinds = newestFirst(
      played('pure', 'sm', 1, { finishedAt: NOON }),
      played('classic', 'sm', 1, { finishedAt: NOON + 3600_000 }),
      game({ seed: dailySeed(new Date(2026, 7, 20), 'sm'), finishedAt: NOON + 7200_000 }),
    );
    expect(ids(threeKinds)).toEqual(expect.arrayContaining(['allThree', 'bothHands']));
  });

  it('works through a list in order, and only counts one list at a time', () => {
    const numbers = (mode: ModeId, upTo: number, sizeId = 'sm') =>
      newestFirst(
        ...Array.from({ length: upTo }, (_, index) =>
          played(mode, sizeId, index + 1, { finishedAt: NOON + index * 1000 }),
        ),
      );
    expect(ids(numbers('pure', 9))).not.toEqual(expect.arrayContaining(['run.10']));
    expect(ids(numbers('pure', 10))).toEqual(expect.arrayContaining(['run.10']));
    // Five of each list is ten games and no run: they are two lists.
    const split = newestFirst(...numbers('pure', 5), ...numbers('classic', 5));
    expect(ids(split)).not.toEqual(expect.arrayContaining(['run.10']));
  });

  /**
   * A game that never counted hints claims nothing here and breaks a run rather
   * than continuing it: it is not known to have been unaided.
   */
  it('counts the unaided games, and what a run of them means', () => {
    expect(ids([game({ hintsAsked: 0 })])).toEqual(expect.arrayContaining(['unaided.1']));
    expect(ids([game({ hintsAsked: null })])).not.toEqual(expect.arrayContaining(['unaided.1']));

    const ten = Array.from({ length: 10 }, (_, index) =>
      game({ hintsAsked: 0, finishedAt: NOON + index * 1000 }),
    );
    expect(ids(newestFirst(...ten))).toEqual(expect.arrayContaining(['unaided.10', 'unaided.row']));
    const broken = [...ten];
    broken[5] = game({ hintsAsked: 2, finishedAt: NOON + 5000 });
    expect(ids(newestFirst(...broken))).not.toEqual(expect.arrayContaining(['unaided.row']));
  });

  it('has a different threshold for a fast board played each way', () => {
    // Three minutes is quick for an Advanced with the board keeping up, and
    // nothing special for one where every cross is yours.
    expect(ids([played('pure', 'sm', 1, { seconds: 175 })])).toEqual(
      expect.arrayContaining(['speed.pure.sm']),
    );
    expect(ids([played('classic', 'sm', 1, { seconds: 175 })])).toEqual(
      expect.arrayContaining(['speed.classic.sm']),
    );
    expect(ids([played('pure', 'sm', 1, { seconds: 200 })])).not.toEqual(
      expect.arrayContaining(['speed.pure.sm']),
    );
    // A daily has no threshold at all: it is played with whatever settings the
    // player keeps, so one person's Advanced is not another's.
    const daily = game({ seed: dailySeed(new Date(2026, 7, 20), 'sm'), seconds: 30 });
    expect(ids([daily])).not.toEqual(expect.arrayContaining(['speed.pure.sm', 'speed.classic.sm']));
  });

  it('measures a personal best against the same list only', () => {
    const faster = newestFirst(
      played('pure', 'sm', 1, { seconds: 400, finishedAt: NOON }),
      played('pure', 'sm', 2, { seconds: 280, finishedAt: NOON + 1000 }),
    );
    expect(ids(faster)).toEqual(expect.arrayContaining(['quarterOff']));

    const otherList = newestFirst(
      played('pure', 'sm', 1, { seconds: 400, finishedAt: NOON }),
      played('classic', 'sm', 1, { seconds: 280, finishedAt: NOON + 1000 }),
    );
    expect(ids(otherList)).not.toEqual(expect.arrayContaining(['quarterOff']));
  });

  it('reads the clock on the wall as well as the one on the board', () => {
    const at = (hour: number) => new Date(2026, 7, 20, hour, 30).getTime();
    expect(ids([game({ finishedAt: at(6) })])).toEqual(expect.arrayContaining(['early']));
    expect(ids([game({ finishedAt: at(2) })])).toEqual(expect.arrayContaining(['early', 'night']));
    expect(ids([game({ finishedAt: at(10) })])).not.toEqual(
      expect.arrayContaining(['early', 'night']),
    );
    expect(ids([game({ seconds: 3700 })])).toEqual(expect.arrayContaining(['played.hour']));
  });

  /**
   * The five the board measures about how it was solved. Null is "not
   * measured" rather than none, so a game from before any of it was counted
   * claims nothing.
   */
  it('reads how the board was arrived at, and nothing from a game that never said', () => {
    expect(ids([game({ undos: 0, conflicted: false, rewinds: 2 })])).toEqual(
      expect.arrayContaining(['clean', 'neverWrong', 'rewound']),
    );
    expect(
      ids([game({ undos: null, conflicted: null, rewinds: null, startedAt: null, resumed: null })]),
    ).not.toEqual(expect.arrayContaining(['clean', 'neverWrong', 'rewound', 'slept']));

    expect(ids([game({ startedAt: NOON - DAY })])).toEqual(expect.arrayContaining(['slept']));
    expect(ids([played('classic', 'xl', 1, { resumed: false })])).toEqual(
      expect.arrayContaining(['oneSitting']),
    );
    expect(ids([played('classic', 'xl', 1, { resumed: true })])).not.toEqual(
      expect.arrayContaining(['oneSitting']),
    );
  });

  it('waits for every lesson before it says the manual has been read', () => {
    const seven = {
      deduction: 1,
      further: 2,
      negative: 3,
      comparison: 4,
      grouped: 5,
      gap: 6,
      vague: 7,
    };
    const { vague, ...six } = seven;
    expect(ids([], six)).toEqual([]);
    const earned = achievementsFor([], seven);
    expect(earned.map((one) => one.id)).toEqual(['manual']);
    // Dated by the last one walked, since that is when it was true.
    expect(earned[0].earnedAt).toBe(7);
  });

  it('draws every card with something, and never the same card twice', () => {
    const history = newestFirst(
      ...Array.from({ length: 30 }, (_, index) =>
        played('pure', 'sm', index + 1, {
          finishedAt: NOON + index * DAY,
          hintsAsked: 0,
          undos: 0,
          conflicted: false,
        }),
      ),
    );
    const earned = achievementsFor(history, { deduction: 1 });
    expect(earned.length).toBeGreaterThan(5);
    expect(new Set(earned.map((one) => one.id)).size).toBe(earned.length);
    for (const one of earned) {
      expect(ACHIEVEMENT_ICONS).toContain(one.icon);
      expect(one.title.length).toBeGreaterThan(0);
      expect(one.description.length).toBeGreaterThan(0);
      expect(one.description.endsWith('.')).toBe(true);
    }
  });
});
