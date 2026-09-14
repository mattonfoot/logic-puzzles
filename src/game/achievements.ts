/**
 * What a player has actually done, worked out from the games they have
 * finished.
 *
 * Nothing is stored for any of this — the same rule `src/stats/summary.ts`
 * follows, and for the same reason: a number written down can drift out of step
 * with the games behind it, and one derived cannot. It also means the cards
 * arrive backdated. A player with forty games behind them gets everything those
 * forty games earned the first time this screen opens, rather than starting
 * from nothing on the day the feature shipped.
 *
 * Only what has been earned is ever built. A list of a hundred and twenty
 * greyed-out rows is a chore list, and the app counts nothing at anybody: the
 * daily streak line and this are the same stance, which is that a number is
 * worth showing when it is yours and worth nothing when it is a target.
 *
 * Everything here is a question about the history, so the history is walked
 * once, oldest first, and each card is dated by the game that earned it. That
 * ordering is the whole trick: a count crossing three is a hat trick *on that
 * day*, not today.
 */
import { SIZES, sizeById } from '../data/sizes';
import { THEMES } from '../data/themes';
import { CLUE_LESSONS, FIRST_LESSONS } from './lessons';
import { dailyDate, numberOn } from './library';
import { modeById, MODES, type ModeId, type PlayedAs } from './modes';
import type { CompletedGame } from './persistence';
import { filedAs } from '../stats/summary';
import { dayKey } from './library';
import { t } from '../i18n';

export interface Achievement {
  /** Stable, and never seen: the id is what stops one being handed out twice. */
  id: string;
  /** A name in `ICONS` — the drawing on the card. */
  icon: string;
  title: string;
  description: string;
  /** When the game that earned it was finished. */
  earnedAt: number;
}

/** The four counts every set is measured at. */
const TIERS = [1, 3, 10, 100] as const;

/**
 * The drawings the cards use, one per family rather than one per card: a
 * hundred and twenty different pictures would be a hundred and twenty things to
 * recognise, where seven say what kind of thing this is at a glance.
 */
const ICON = {
  /**
   * The four tiers. The first is a medal — a struck edge with a 1 in it — and
   * the hundred is the same edge with a centurion's helmet in profile on it,
   * since a century is a hundred of something and a hundred pips at 26 points
   * is a smudge. The two in between are drawn as what they count, stacked as
   * pyramids — three and ten are both triangular numbers, so both come out
   * square with no pip left over.
   */
  one: 'ui/icon-one',
  three: 'ui/icon-three',
  ten: 'ui/icon-ten',
  hundred: 'ui/icon-century',
  /** Days: streaks, a puzzle slept on, a week away and back. */
  calendar: 'ui/icon-calendar',
  /** Ground covered: the ladders, the themes, working through a list. */
  chart: 'ui/icon-chart',
  /** Without: a puzzle finished with no hint asked for. */
  without: 'ui/icon-without',
  /** The clock: thresholds, the hour, the small hours. */
  clock: 'ui/icon-clock',
  /** A tick: a board arrived at cleanly. */
  tick: 'ui/mark-tick-hand',
  /** Back: a board that had to be wound back and came out anyway. */
  back: 'ui/icon-back',
  /** The lessons. */
  book: 'ui/icon-book',
} as const;

/** Every drawing a card can ask for, so the icon set can be held to exactly these. */
export const ACHIEVEMENT_ICONS: string[] = [...new Set(Object.values(ICON))];

const TIER_ICON: Record<number, string> = {
  1: ICON.one,
  3: ICON.three,
  10: ICON.ten,
  100: ICON.hundred,
};

/** How long a board of each shape is a fast one, in seconds, and for which game. */
const QUICK: Record<ModeId, Record<string, number>> = {
  pure: { xs: 60, sm: 180, md: 300, lg: 480, xl: 900 },
  classic: { xs: 120, sm: 300, md: 540, lg: 840, xl: 1500 },
};

/** What each set of counting cards is called, and what it is. */
const SETS: Record<'all' | PlayedAs, { one: string; many: string; body: string }> = {
  all: {
    one: t('achievements.all.one'),
    many: t('achievements.all.many'),
    body: t('achievements.all.body'),
  },
  pure: {
    one: t('achievements.kinds.pure.one'),
    many: t('achievements.kinds.pure.many'),
    body: t('achievements.kinds.pure.body'),
  },
  classic: {
    one: t('achievements.kinds.classic.one'),
    many: t('achievements.kinds.classic.many'),
    body: t('achievements.kinds.classic.body'),
  },
  daily: {
    one: t('achievements.kinds.daily.one'),
    many: t('achievements.kinds.daily.many'),
    body: t('achievements.kinds.daily.body'),
  },
};

/** "First pure game", "Ten dailies": the count is the card's name. */
function countedTitle(tier: number, one: string, many: string): string {
  if (tier === 1) return t('achievements.count.one', { one });
  if (tier === 3) return t('achievements.count.three', { many });
  if (tier === 10) return t('achievements.count.ten', { many });
  return t('achievements.count.hundred', { many });
}

const SPEED = {
  pure: {
    xs: {
      title: t('achievements.speed.pure.xs.title'),
      body: t('achievements.speed.pure.xs.body'),
    },
    sm: {
      title: t('achievements.speed.pure.sm.title'),
      body: t('achievements.speed.pure.sm.body'),
    },
    md: {
      title: t('achievements.speed.pure.md.title'),
      body: t('achievements.speed.pure.md.body'),
    },
    lg: {
      title: t('achievements.speed.pure.lg.title'),
      body: t('achievements.speed.pure.lg.body'),
    },
    xl: {
      title: t('achievements.speed.pure.xl.title'),
      body: t('achievements.speed.pure.xl.body'),
    },
  },
  classic: {
    xs: {
      title: t('achievements.speed.classic.xs.title'),
      body: t('achievements.speed.classic.xs.body'),
    },
    sm: {
      title: t('achievements.speed.classic.sm.title'),
      body: t('achievements.speed.classic.sm.body'),
    },
    md: {
      title: t('achievements.speed.classic.md.title'),
      body: t('achievements.speed.classic.md.body'),
    },
    lg: {
      title: t('achievements.speed.classic.lg.title'),
      body: t('achievements.speed.classic.lg.body'),
    },
    xl: {
      title: t('achievements.speed.classic.xl.title'),
      body: t('achievements.speed.classic.xl.body'),
    },
  },
} satisfies Record<ModeId, Record<string, { title: string; body: string }>>;

/** Local calendar day as a number, so "the day after" is a subtraction. */
const dayNumber = (at: number): number => {
  const date = new Date(at);
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
};

const LESSONS = [...FIRST_LESSONS, ...CLUE_LESSONS];

/**
 * Everything the player has earned, newest first.
 *
 * `history` is newest first, the way it is stored; `lessons` is the record of
 * which lessons have been walked to the end, which is the one thing here that
 * is not a game.
 */
export function achievementsFor(
  history: CompletedGame[],
  lessons: Record<string, number> = {},
): Achievement[] {
  const earned = new Map<string, Achievement>();
  const award = (id: string, icon: string, title: string, description: string, at: number) => {
    if (!earned.has(id)) earned.set(id, { id, icon, title, description, earnedAt: at });
  };

  // Oldest first, so a card is dated by the game that earned it rather than by
  // whatever happens to be at the front of the list.
  const games = [...history].filter((game) => !game.revealed).reverse();

  const counts = new Map<string, number>();
  const count = (key: string): number => {
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next;
  };
  /** Awards whichever tier this count has just reached, if any. */
  const counted = (
    key: string,
    reached: number,
    words: { one: string; many: string; body: string },
    at: number,
  ) => {
    if (!TIERS.includes(reached as (typeof TIERS)[number])) return;
    award(
      `${key}.${reached}`,
      TIER_ICON[reached],
      countedTitle(reached, words.one, words.many),
      words.body,
      at,
    );
  };

  // What the walk keeps as it goes.
  const days: number[] = [];
  let run = 0;
  const dailyDays: number[] = [];
  let dailyRun = 0;
  const sweeps = new Map<string, Set<string>>();
  const sizesByKind = new Map<PlayedAs, Set<string>>();
  const sizesByDay = new Map<number, Set<string>>();
  const kindsByDay = new Map<number, Set<PlayedAs>>();
  const themes = new Set<string>();
  const numbersByList = new Map<string, Set<number>>();
  const bests = new Map<string, number>();
  let unaidedRun = 0;
  let unaidedTotal = 0;
  let seconds = 0;
  let previousFinish: number | null = null;

  for (const game of games) {
    const kind = filedAs(game);
    const at = game.finishedAt;
    const day = dayNumber(at);

    // The counting ladders: everything, this kind of game, and this kind at
    // this difficulty. A difficulty never counts on its own.
    counted('all', count('all'), SETS.all, at);
    counted(`kind.${kind}`, count(`kind.${kind}`), SETS[kind], at);
    const difficulty = sizeById(game.sizeId)?.difficulty ?? game.difficulty;
    const kindName = kind === 'daily' ? t('modes.daily') : modeById(kind).short;
    counted(
      `pair.${kind}.${game.sizeId}`,
      count(`pair.${kind}.${game.sizeId}`),
      {
        one: t('achievements.pair.one', { kind: kindName, difficulty }),
        many: t('achievements.pair.many', { kind: kindName, difficulty }),
        body: t('achievements.pair.body', { kind: kindName, difficulty }),
      },
      at,
    );

    // Days running, counting each day once.
    if (days.length === 0 || days[days.length - 1] !== day) {
      run = days.length > 0 && day - days[days.length - 1] === 1 ? run + 1 : 1;
      days.push(day);
      if (run === 3)
        award(
          'streak.3',
          ICON.calendar,
          t('achievements.streak.three.title'),
          t('achievements.streak.three.body'),
          at,
        );
      if (run === 7)
        award(
          'streak.7',
          ICON.calendar,
          t('achievements.streak.week.title'),
          t('achievements.streak.week.body'),
          at,
        );
      if (run === 30)
        award(
          'streak.30',
          ICON.calendar,
          t('achievements.streak.month.title'),
          t('achievements.streak.month.body'),
          at,
        );
      if (run === 100)
        award(
          'streak.100',
          ICON.calendar,
          t('achievements.streak.hundred.title'),
          t('achievements.streak.hundred.body'),
          at,
        );
    }

    // A week away and back again: the kind one, since nothing is lost by
    // stopping and something is worth saying to somebody who returns.
    if (previousFinish !== null && day - dayNumber(previousFinish) >= 7) {
      award('back', ICON.calendar, t('achievements.back.title'), t('achievements.back.body'), at);
    }
    previousFinish = at;

    if (kind === 'daily') {
      // A daily done on the day it was set, which is what a daily streak is.
      const set = dayNumber(dailyDate(game.seed).getTime());
      if (set === day) {
        if (dailyDays.length === 0 || dailyDays[dailyDays.length - 1] !== day) {
          dailyRun =
            dailyDays.length > 0 && day - dailyDays[dailyDays.length - 1] === 1 ? dailyRun + 1 : 1;
          dailyDays.push(day);
          if (dailyRun === 7)
            award(
              'daily.streak.7',
              ICON.calendar,
              t('achievements.dailyStreak.week.title'),
              t('achievements.dailyStreak.week.body'),
              at,
            );
          if (dailyRun === 30)
            award(
              'daily.streak.30',
              ICON.calendar,
              t('achievements.dailyStreak.month.title'),
              t('achievements.dailyStreak.month.body'),
              at,
            );
        }
      }
      // All five of one date's challenges, whenever they were played.
      const key = dayKey(dailyDate(game.seed));
      const swept = sweeps.get(key) ?? new Set<string>();
      swept.add(game.sizeId);
      sweeps.set(key, swept);
      if (swept.size === SIZES.length) {
        award('sweep', ICON.chart, t('achievements.sweep.title'), t('achievements.sweep.body'), at);
      }
    }

    // The ladders: every difficulty, in one kind of game and in one day.
    const inKind = sizesByKind.get(kind) ?? new Set<string>();
    inKind.add(game.sizeId);
    sizesByKind.set(kind, inKind);
    if (inKind.size === SIZES.length && kind !== 'daily') {
      const which = kind === 'pure' ? 'ladder.pure' : 'ladder.classic';
      award(
        which,
        ICON.chart,
        kind === 'pure'
          ? t('achievements.ladder.pure.title')
          : t('achievements.ladder.classic.title'),
        kind === 'pure'
          ? t('achievements.ladder.pure.body')
          : t('achievements.ladder.classic.body'),
        at,
      );
    }
    const today = sizesByDay.get(day) ?? new Set<string>();
    today.add(game.sizeId);
    sizesByDay.set(day, today);
    if (today.size === SIZES.length) {
      award(
        'ladder.day',
        ICON.chart,
        t('achievements.ladder.day.title'),
        t('achievements.ladder.day.body'),
        at,
      );
    }

    // Both ways of playing, and all three kinds in one day.
    if (MODES.every((mode) => (counts.get(`kind.${mode.id}`) ?? 0) > 0)) {
      award(
        'bothHands',
        ICON.chart,
        t('achievements.bothHands.title'),
        t('achievements.bothHands.body'),
        at,
      );
    }
    const kinds = kindsByDay.get(day) ?? new Set<PlayedAs>();
    kinds.add(kind);
    kindsByDay.set(day, kinds);
    if (kinds.size === 3) {
      award(
        'allThree',
        ICON.chart,
        t('achievements.allThree.title'),
        t('achievements.allThree.body'),
        at,
      );
    }

    themes.add(game.themeId);
    if (themes.size >= THEMES.length) {
      award(
        'themes',
        ICON.chart,
        t('achievements.themes.title'),
        t('achievements.themes.body'),
        at,
      );
    }

    // Working through the catalogue: puzzles 1 to 10, and 1 to 25, off one
    // list — which is one difficulty played one way, since that is what a list
    // is. A daily has no number and no list.
    if (kind !== 'daily') {
      const number = numberOn(game.seed, game.sizeId, kind);
      if (number !== null) {
        const list = `${kind}.${game.sizeId}`;
        const numbers = numbersByList.get(list) ?? new Set<number>();
        numbers.add(number);
        numbersByList.set(list, numbers);
        const upTo = (last: number) =>
          Array.from({ length: last }, (_, index) => index + 1).every((one) => numbers.has(one));
        if (upTo(10))
          award(
            'run.10',
            ICON.chart,
            t('achievements.run.ten.title'),
            t('achievements.run.ten.body'),
            at,
          );
        if (upTo(25))
          award(
            'run.25',
            ICON.chart,
            t('achievements.run.group.title'),
            t('achievements.run.group.body'),
            at,
          );
      }
    }

    // Unaided. A game that never counted hints cannot claim one of these, and
    // breaks a run rather than continuing it: it is not known to be unaided.
    if (game.hintsAsked === 0) {
      unaidedTotal++;
      unaidedRun++;
      if (unaidedTotal === 1)
        award(
          'unaided.1',
          ICON.without,
          t('achievements.unaided.one.title'),
          t('achievements.unaided.one.body'),
          at,
        );
      if (unaidedTotal === 10)
        award(
          'unaided.10',
          ICON.without,
          t('achievements.unaided.ten.title'),
          t('achievements.unaided.ten.body'),
          at,
        );
      if (unaidedTotal === 100)
        award(
          'unaided.100',
          ICON.without,
          t('achievements.unaided.hundred.title'),
          t('achievements.unaided.hundred.body'),
          at,
        );
      if (unaidedRun === 10)
        award(
          'unaided.row',
          ICON.without,
          t('achievements.unaided.row.title'),
          t('achievements.unaided.row.body'),
          at,
        );
      if (game.sizeId === 'xl' && kind === 'pure') {
        award(
          'unaided.legend',
          ICON.without,
          t('achievements.unaided.legend.title'),
          t('achievements.unaided.legend.body'),
          at,
        );
      }
      if (game.sizeId === 'xl' && kind === 'classic') {
        award(
          'unaided.legend.classic',
          ICON.without,
          t('achievements.unaided.legendClassic.title'),
          t('achievements.unaided.legendClassic.body'),
          at,
        );
      }
    } else {
      unaidedRun = 0;
    }

    // The clock. A daily is left out of the thresholds: it is played with
    // whatever settings the player keeps, so one person's Legend daily is not
    // another's.
    if (kind !== 'daily') {
      const quick = QUICK[kind][game.sizeId];
      const words = SPEED[kind][game.sizeId as keyof (typeof SPEED)['pure']];
      if (quick !== undefined && words && game.seconds <= quick) {
        award(`speed.${kind}.${game.sizeId}`, ICON.clock, words.title, words.body, at);
      }
    }
    const list = `${kind}.${game.sizeId}`;
    const best = bests.get(list);
    if (best !== undefined && game.seconds <= best * 0.75) {
      award(
        'quarterOff',
        ICON.clock,
        t('achievements.quarterOff.title'),
        t('achievements.quarterOff.body'),
        at,
      );
    }
    if (best === undefined || game.seconds < best) bests.set(list, game.seconds);

    const hour = new Date(at).getHours();
    if (hour < 7)
      award('early', ICON.clock, t('achievements.early.title'), t('achievements.early.body'), at);
    if (hour < 4)
      award('night', ICON.clock, t('achievements.night.title'), t('achievements.night.body'), at);

    seconds += game.seconds;
    if (seconds >= 3600)
      award(
        'played.hour',
        ICON.clock,
        t('achievements.played.hour.title'),
        t('achievements.played.hour.body'),
        at,
      );
    if (seconds >= 36_000)
      award(
        'played.10h',
        ICON.clock,
        t('achievements.played.tenHours.title'),
        t('achievements.played.tenHours.body'),
        at,
      );
    if (seconds >= 86_400)
      award(
        'played.day',
        ICON.clock,
        t('achievements.played.day.title'),
        t('achievements.played.day.body'),
        at,
      );

    // How the board was arrived at. Null is "not measured" rather than none, so
    // a game from before any of this was counted claims nothing.
    if (game.undos === 0)
      award('clean', ICON.tick, t('achievements.clean.title'), t('achievements.clean.body'), at);
    if (game.conflicted === false)
      award(
        'neverWrong',
        ICON.tick,
        t('achievements.neverWrong.title'),
        t('achievements.neverWrong.body'),
        at,
      );
    if (game.rewinds !== null && game.rewinds > 0)
      award(
        'rewound',
        ICON.back,
        t('achievements.rewound.title'),
        t('achievements.rewound.body'),
        at,
      );
    if (game.startedAt !== null && dayNumber(game.startedAt) < day) {
      award(
        'slept',
        ICON.calendar,
        t('achievements.slept.title'),
        t('achievements.slept.body'),
        at,
      );
    }
    if (game.resumed === false && kind === 'classic' && game.sizeId === 'xl') {
      award(
        'oneSitting',
        ICON.clock,
        t('achievements.oneSitting.title'),
        t('achievements.oneSitting.body'),
        at,
      );
    }
  }

  // The one card that is not about a game.
  const walked = LESSONS.map((lesson) => lessons[lesson]);
  if (walked.every((at) => typeof at === 'number')) {
    award(
      'manual',
      ICON.book,
      t('achievements.manual.title'),
      t('achievements.manual.body'),
      Math.max(...(walked as number[])),
    );
  }

  return [...earned.values()].sort((a, b) => b.earnedAt - a.earnedAt);
}
