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
import { gameTitle, modeById, MODES, type ModeId, type PlayedAs } from './modes';
import type { CompletedGame } from './persistence';
import { filedAs } from '../stats/summary';
import { dayKey } from './library';
import { t, type StringKey } from '../i18n';
import { localDay } from './time';

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
   * is a smudge. The third is a rabbit coming out of a top hat — held the way a
   * magician holds it, mouth up, brim at the top — because a third of anything
   * is a hat trick and the pun is the only joke in the app. The ten is
   * drawn as what it counts: a pyramid of pips standing on its point, ten being
   * a triangular number and so coming out square with none left over.
   */
  one: 'ui/icon-one',
  three: 'ui/icon-hat',
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

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** How long a board of each shape is a fast one, in seconds, and for which game. */
const QUICK: Record<ModeId, Record<Size, number>> = {
  pure: { xs: 60, sm: 180, md: 300, lg: 480, xl: 900 },
  classic: { xs: 120, sm: 300, md: 540, lg: 840, xl: 1500 },
};

/** What a set of counting cards is called, and what it is. */
const setWords = (key: 'all' | `kinds.${PlayedAs}`) => ({
  one: t(`achievements.${key}.one`),
  many: t(`achievements.${key}.many`),
  body: t(`achievements.${key}.body`),
});

const SETS: Record<'all' | PlayedAs, { one: string; many: string; body: string }> = {
  all: setWords('all'),
  pure: setWords('kinds.pure'),
  classic: setWords('kinds.classic'),
  daily: setWords('kinds.daily'),
};

/** "First pure game", "Ten dailies": the count is the card's name. */
function countedTitle(tier: number, one: string, many: string): string {
  if (tier === 1) return t('achievements.count.one', { one });
  if (tier === 3) return t('achievements.count.three', { many });
  if (tier === 10) return t('achievements.count.ten', { many });
  return t('achievements.count.hundred', { many });
}

/**
 * A card with a title and a body of its own in the language file, under
 * `achievements.<key>`: most of them.
 */
type CardKey = StringKey extends infer K
  ? K extends `achievements.${infer Key}.title`
    ? Key
    : never
  : never;

/** Runs of days, and what each length is called. */
const STREAKS = { 3: 'three', 7: 'week', 30: 'month', 100: 'hundred' } as const;
/** The same, for dailies done on the day they were set. */
const DAILY_STREAKS = { 7: 'week', 30: 'month' } as const;
/** Games finished without a hint, all told. */
const UNAIDED = { 1: 'one', 10: 'ten', 100: 'hundred' } as const;
/** Time played, all told, in seconds: the card's id, and what it is called. */
const PLAYED = [
  [3600, 'hour', 'hour'],
  [36_000, '10h', 'tenHours'],
  [86_400, 'day', 'day'],
] as const;

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
  const card = (id: string, icon: string, key: CardKey, at: number) =>
    award(id, icon, t(`achievements.${key}.title`), t(`achievements.${key}.body`), at);

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
    const day = localDay(at);

    // The counting ladders: everything, this kind of game, and this kind at
    // this difficulty. A difficulty never counts on its own.
    counted('all', count('all'), SETS.all, at);
    counted(`kind.${kind}`, count(`kind.${kind}`), SETS[kind], at);
    // Counted under the name the board itself carried, so a card and the game
    // it was earned on call the same thing the same thing.
    const played = gameTitle(kind, sizeById(game.sizeId)?.difficulty ?? game.difficulty);
    counted(
      `pair.${kind}.${game.sizeId}`,
      count(`pair.${kind}.${game.sizeId}`),
      {
        one: t('achievements.pair.one', { game: played }),
        many: t('achievements.pair.many', { game: played }),
        body: t('achievements.pair.body', { game: played }),
      },
      at,
    );

    // Days running, counting each day once.
    if (days.length === 0 || days[days.length - 1] !== day) {
      run = days.length > 0 && day - days[days.length - 1] === 1 ? run + 1 : 1;
      days.push(day);
      const streak = STREAKS[run as keyof typeof STREAKS];
      if (streak) card(`streak.${run}`, ICON.calendar, `streak.${streak}`, at);
    }

    // A week away and back again: the kind one, since nothing is lost by
    // stopping and something is worth saying to somebody who returns.
    if (previousFinish !== null && day - localDay(previousFinish) >= 7) {
      card('back', ICON.calendar, 'back', at);
    }
    previousFinish = at;

    if (kind === 'daily') {
      // A daily done on the day it was set, which is what a daily streak is.
      const set = localDay(dailyDate(game.seed).getTime());
      if (set === day) {
        if (dailyDays.length === 0 || dailyDays[dailyDays.length - 1] !== day) {
          dailyRun =
            dailyDays.length > 0 && day - dailyDays[dailyDays.length - 1] === 1 ? dailyRun + 1 : 1;
          dailyDays.push(day);
          const streak = DAILY_STREAKS[dailyRun as keyof typeof DAILY_STREAKS];
          if (streak) card(`daily.streak.${dailyRun}`, ICON.calendar, `dailyStreak.${streak}`, at);
        }
      }
      // All five of one date's challenges, whenever they were played.
      const key = dayKey(dailyDate(game.seed));
      const swept = sweeps.get(key) ?? new Set<string>();
      swept.add(game.sizeId);
      sweeps.set(key, swept);
      if (swept.size === SIZES.length) {
        card('sweep', ICON.chart, 'sweep', at);
      }
    }

    // The ladders: every difficulty, in one kind of game and in one day.
    const inKind = sizesByKind.get(kind) ?? new Set<string>();
    inKind.add(game.sizeId);
    sizesByKind.set(kind, inKind);
    if (inKind.size === SIZES.length && kind !== 'daily') {
      card(`ladder.${kind}`, ICON.chart, `ladder.${kind}`, at);
    }
    const today = sizesByDay.get(day) ?? new Set<string>();
    today.add(game.sizeId);
    sizesByDay.set(day, today);
    if (today.size === SIZES.length) {
      card('ladder.day', ICON.chart, 'ladder.day', at);
    }

    // Both ways of playing, and all three kinds in one day.
    if (MODES.every((mode) => (counts.get(`kind.${mode.id}`) ?? 0) > 0)) {
      card('bothHands', ICON.chart, 'bothHands', at);
    }
    const kinds = kindsByDay.get(day) ?? new Set<PlayedAs>();
    kinds.add(kind);
    kindsByDay.set(day, kinds);
    if (kinds.size === 3) {
      card('allThree', ICON.chart, 'allThree', at);
    }

    themes.add(game.themeId);
    if (themes.size >= THEMES.length) {
      card('themes', ICON.chart, 'themes', at);
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
        if (upTo(10)) card('run.10', ICON.chart, 'run.ten', at);
        if (upTo(25)) card('run.25', ICON.chart, 'run.group', at);
      }
    }

    // Unaided. A game that never counted hints cannot claim one of these, and
    // breaks a run rather than continuing it: it is not known to be unaided.
    if (game.hintsAsked === 0) {
      unaidedTotal++;
      unaidedRun++;
      const unaided = UNAIDED[unaidedTotal as keyof typeof UNAIDED];
      if (unaided) card(`unaided.${unaidedTotal}`, ICON.without, `unaided.${unaided}`, at);
      if (unaidedRun === 10) card('unaided.row', ICON.without, 'unaided.row', at);
      if (game.sizeId === 'xl' && kind === 'pure') {
        card('unaided.legend', ICON.without, 'unaided.legend', at);
      }
      if (game.sizeId === 'xl' && kind === 'classic') {
        card('unaided.legend.classic', ICON.without, 'unaided.legendClassic', at);
      }
    } else {
      unaidedRun = 0;
    }

    // The clock. A daily is left out of the thresholds: it is played with
    // whatever settings the player keeps, so one person's Legend daily is not
    // another's.
    if (kind !== 'daily') {
      const size = game.sizeId as Size;
      const quick = QUICK[kind][size];
      if (quick !== undefined && game.seconds <= quick) {
        card(`speed.${kind}.${size}`, ICON.clock, `speed.${kind}.${size}`, at);
      }
    }
    const list = `${kind}.${game.sizeId}`;
    const best = bests.get(list);
    if (best !== undefined && game.seconds <= best * 0.75) {
      card('quarterOff', ICON.clock, 'quarterOff', at);
    }
    if (best === undefined || game.seconds < best) bests.set(list, game.seconds);

    const hour = new Date(at).getHours();
    if (hour < 7) card('early', ICON.clock, 'early', at);
    if (hour < 4) card('night', ICON.clock, 'night', at);

    seconds += game.seconds;
    for (const [after, id, key] of PLAYED) {
      if (seconds >= after) card(`played.${id}`, ICON.clock, `played.${key}`, at);
    }

    // How the board was arrived at. Null is "not measured" rather than none, so
    // a game from before any of this was counted claims nothing.
    if (game.undos === 0) card('clean', ICON.tick, 'clean', at);
    if (game.conflicted === false) card('neverWrong', ICON.tick, 'neverWrong', at);
    if (game.rewinds !== null && game.rewinds > 0) card('rewound', ICON.back, 'rewound', at);
    if (game.startedAt !== null && localDay(game.startedAt) < day) {
      card('slept', ICON.calendar, 'slept', at);
    }
    if (game.resumed === false && kind === 'classic' && game.sizeId === 'xl') {
      card('oneSitting', ICON.clock, 'oneSitting', at);
    }
  }

  // The one card that is not about a game.
  const walked = LESSONS.map((lesson) => lessons[lesson]);
  if (walked.every((at) => typeof at === 'number')) {
    card('manual', ICON.book, 'manual', Math.max(...(walked as number[])));
  }

  return [...earned.values()].sort((a, b) => b.earnedAt - a.earnedAt);
}
