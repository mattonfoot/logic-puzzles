import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { sizeById } from '../../data/sizes';
import { dailySeed } from '../../game/library';
import type { SavedGame } from '../../game/persistence';
import { DEFAULT_SETTINGS } from '../../game/settings';
import { DailyScreen } from '../DailyScreen';
import { GameMenuScreen } from '../GameMenuScreen';
import { GameScreen } from '../GameScreen';
import { NumbersScreen } from '../NumbersScreen';
import { ResultScreen } from '../ResultScreen';
import { SettingsScreen } from '../SettingsScreen';
import { SetupScreen } from '../SetupScreen';
import { StartScreen } from '../StartScreen';
import { StatsScreen } from '../StatsScreen';
import { TutorialScreen } from '../TutorialScreen';
import { tutorialPuzzle } from '../../game/tutorial';
import { NOON, game, puzzleOne, savedGame, stage, statsOf } from './stage';

/**
 * Every screen, mounted the way the app mounts it, and read the way a screen
 * reader would.
 *
 * These are smoke tests: does it come up, are the right words on it, and are
 * the buttons that should be dead actually dead. They find things by
 * accessibility role and label — the same handles the screenshot walkthrough
 * drives the browser build by — so a screen that passes here is one both a
 * VoiceOver user and the screenshot script can get around. What a screen looks
 * like is not asked here; that is what `docs/screenshots` is for.
 */

/**
 * The one element with this role that is *itself* called this.
 *
 * A role query's `name` matches anything inside the element as well as its own
 * label, so the backdrop behind a window — a button called Close that holds
 * the whole window — also answers to every button in it. Dropping any match
 * that has another match inside it leaves the innermost one, which is the one
 * that carries the name.
 */
function only(role: string, name: string) {
  const found = screen.getAllByRole(role, { name });
  const own = found.filter((el) => !found.some((other) => other !== el && within(el, other)));
  if (own.length !== 1) {
    throw new Error(`Expected one ${role} called "${name}", found ${own.length}`);
  }
  return own[0];
}

type Element = ReturnType<typeof screen.getAllByRole>[number];

function within(ancestor: Element, node: Element): boolean {
  for (let at = node.parent; at; at = at.parent) if (at === ancestor) return true;
  return false;
}

const button = (name: string) => only('button', name);
const header = (name: string) => only('header', name);
const checkbox = (name: string) => only('checkbox', name);
const none = () => {};

describe('the front door', () => {
  it('opens on the four ways in', () => {
    const onPlay = jest.fn();
    const onHowToPlay = jest.fn();
    stage(
      <StartScreen
        onDaily={none}
        onPlay={onPlay}
        onHowToPlay={onHowToPlay}
        onOpenSettings={none}
        onOpenStats={none}
      />,
    );

    for (const door of ['Daily', 'Play', 'How to play', 'Settings', 'Statistics']) {
      expect(button(door)).toBeEnabled();
    }

    fireEvent.press(button('Play'));
    expect(onPlay).toHaveBeenCalledTimes(1);

    fireEvent.press(button('How to play'));
    expect(onHowToPlay).toHaveBeenCalledTimes(1);
  });
});

describe('how to play', () => {
  const puzzle = tutorialPuzzle();
  /** A square, by the two it names — the way the board labels every cell. */
  const square = (customer: number, drink: number) =>
    new RegExp(
      `^${puzzle.categories[0].items[customer].label} and ${puzzle.categories[1].items[drink].label}: `,
    );

  function walk() {
    stage(<TutorialScreen onBack={none} />);
    const measured = screen.UNSAFE_getAllByType(View).find((view) => view.props.onLayout);
    if (!measured) throw new Error('the board never measures itself');
    fireEvent(measured, 'layout', { nativeEvent: { layout: { width: 340, height: 420 } } });
  }

  const tap = (customer: number, drink: number, times = 1) => {
    for (let at = 0; at < times; at++) {
      fireEvent.press(screen.getByRole('button', { name: square(customer, drink) }));
    }
  };

  it('opens on the first thing to do, with the clue it follows from', () => {
    walk();

    expect(header('How to play')).toBeOnTheScreen();
    expect(screen.getByText(/Every square asks the same question/)).toBeOnTheScreen();
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();
    expect(screen.getByText('The clue')).toBeOnTheScreen();
    expect(
      screen.getByText('Ms Barley is not on the same ticket as the Latte drinker.'),
    ).toBeOnTheScreen();
    expect(button('Back')).toBeEnabled();
  });

  it('waits for the mark it asked for, and moves on when it lands', () => {
    walk();

    // A tap somewhere else is allowed and teaches nothing; the ask stands.
    tap(2, 1);
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();

    tap(0, 0);
    expect(screen.getByText(/Ruled out\. Crossing pairs off/)).toBeOnTheScreen();
    expect(screen.getByText(/Tap where Alderman Crumb meets the chai twice/)).toBeOnTheScreen();
    expect(
      screen.getByText('Alderman Crumb is on the same ticket as the Chai drinker.'),
    ).toBeOnTheScreen();
  });

  it('crosses off the rest of the row and column, and says so', () => {
    walk();
    tap(0, 0);
    tap(1, 2, 2);

    expect(screen.getByText(/A tick settles a whole row and a whole column/)).toBeOnTheScreen();
    // Crumb's other two and the chai's other two, all ruled out without a tap.
    for (const [customer, drink] of [
      [1, 0],
      [1, 1],
      [0, 2],
      [2, 2],
    ]) {
      expect(
        screen.getByRole('button', { name: square(customer, drink) }).props.accessibilityLabel,
      ).toMatch(/ruled out$/);
    }
  });

  it('leaves the last square to the player, and stops talking after it', () => {
    walk();
    tap(0, 0);
    tap(1, 2, 2);
    tap(0, 1, 2);

    // No clue for the last one, so there is none on the screen.
    expect(screen.getByText(/One square left, and nothing left to read/)).toBeOnTheScreen();
    expect(screen.queryByText('The clue')).toBeNull();

    tap(2, 0, 2);
    expect(screen.getByText(/Solved\./)).toBeOnTheScreen();
    expect(screen.queryByText(/Tap/)).toBeNull();
  });

  /** Whether a square is wearing the ring that says "this one". */
  const ringed = (customer: number, drink: number) =>
    StyleSheet.flatten(screen.getByRole('button', { name: square(customer, drink) }).props.style)
      .borderWidth === 3;

  it('rings the square it is waiting for, and only that one', () => {
    walk();

    expect(ringed(0, 0)).toBe(true);
    for (const [customer, drink] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      expect(ringed(customer, drink)).toBe(false);
    }

    // A mark somewhere else does not move it.
    tap(2, 1);
    expect(ringed(0, 0)).toBe(true);

    // The mark it wanted does.
    tap(0, 0);
    expect(ringed(0, 0)).toBe(false);
    expect(ringed(1, 2)).toBe(true);
  });

  it('keeps the ring on while a half-made mark is on the square', () => {
    walk();
    tap(0, 0);

    // One tap of the two the tick needs: a cross, which is not what was asked.
    tap(1, 2);
    expect(ringed(1, 2)).toBe(true);
    tap(1, 2);
    expect(ringed(1, 2)).toBe(false);
  });

  it('takes the ring off once there is nothing left to ask for', () => {
    walk();
    tap(0, 0);
    tap(1, 2, 2);
    tap(0, 1, 2);
    tap(2, 0, 2);

    for (let customer = 0; customer < 3; customer++) {
      for (let drink = 0; drink < 3; drink++) expect(ringed(customer, drink)).toBe(false);
    }
  });

  it('says so at once when a mark cannot be right, and stops when it is put back', () => {
    walk();

    // Mrs Marzipan does drink the latte, so crossing it off is wrong.
    tap(2, 0);
    expect(
      screen.getByText(
        'That one cannot be right, so the board has shaded it. Tap it round until it clears.',
      ),
    ).toBeOnTheScreen();
    // The ask it interrupted is still standing.
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();

    // Round to a tick, which is true, and the notice has nothing to say.
    tap(2, 0);
    expect(screen.queryByText(/cannot be right/)).toBeNull();
  });

  it('counts them when one wrong tick drags others in with it', () => {
    walk();

    // A tick on Ms Barley's chai is wrong, and the crosses it lays down for
    // itself are wrong twice over.
    tap(0, 2, 2);
    expect(
      screen.getByText(
        'Those cannot be right, so the board has shaded them. Tap each round until it clears.',
      ),
    ).toBeOnTheScreen();
  });

  it('says nothing about a mark that is merely somewhere else', () => {
    walk();

    // True, just not what was asked for.
    tap(2, 1);
    expect(screen.queryByText(/cannot be right/)).toBeNull();
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();
  });

  it('asks before letting a half-walked lesson go', () => {
    const onBack = jest.fn();
    stage(<TutorialScreen onBack={onBack} />);
    const measured = screen.UNSAFE_getAllByType(View).find((view) => view.props.onLayout);
    fireEvent(measured!, 'layout', { nativeEvent: { layout: { width: 340, height: 420 } } });

    fireEvent.press(button('Back'));
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByText('Leave the lesson?')).toBeOnTheScreen();
    expect(screen.getByText(/starts from the beginning next time/)).toBeOnTheScreen();

    // Staying puts the window away and leaves the board as it was.
    fireEvent.press(button('Keep going'));
    expect(screen.queryByText('Leave the lesson?')).toBeNull();
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();

    fireEvent.press(button('Back'));
    fireEvent.press(button('Leave it'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('lets a finished one go without asking', () => {
    const onBack = jest.fn();
    stage(<TutorialScreen onBack={onBack} />);
    const measured = screen.UNSAFE_getAllByType(View).find((view) => view.props.onLayout);
    fireEvent(measured!, 'layout', { nativeEvent: { layout: { width: 340, height: 420 } } });
    tap(0, 0);
    tap(1, 2, 2);
    tap(0, 1, 2);
    tap(2, 0, 2);

    fireEvent.press(button('Back'));
    expect(screen.queryByText('Leave the lesson?')).toBeNull();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Nothing anywhere remembers that this has been done, which is what lets it
   * be taken twice — and is why walking it and coming back lands on the first
   * mark rather than the finish.
   */
  it('opens on an empty board however many times it is opened', () => {
    walk();
    tap(0, 0);
    tap(1, 2, 2);
    expect(screen.getByText(/A tick settles a whole row/)).toBeOnTheScreen();
    screen.unmount();

    walk();
    expect(screen.getByText(/Every square asks the same question/)).toBeOnTheScreen();
    expect(screen.getByText(/Tap where Ms Barley meets the latte/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: square(1, 2) }).props.accessibilityLabel).toMatch(
      /unknown$/,
    );
  });
});

describe('the difficulties', () => {
  const difficulties = ['Beginner', 'Advanced', 'Expert', 'Pro'];

  it('lists every difficulty under the heading, and nothing to continue', () => {
    const onChoose = jest.fn();
    stage(
      <SetupScreen
        busy={false}
        savedGame={null}
        onChoose={onChoose}
        onResume={none}
        onBack={none}
      />,
    );

    expect(header('Play')).toBeOnTheScreen();
    for (const difficulty of difficulties) expect(button(difficulty)).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(button('Back')).toBeEnabled();

    fireEvent.press(button('Advanced'));
    expect(onChoose).toHaveBeenCalledWith(sizeById('sm'));
  });

  it('offers a game left part-way through, and says what is waiting behind it', () => {
    const onResume = jest.fn();
    const waiting = savedGame();
    stage(
      <SetupScreen
        busy={false}
        savedGame={waiting}
        onChoose={none}
        onResume={onResume}
        onBack={none}
      />,
    );

    const resume = button('Continue');
    expect(resume).toBeEnabled();
    expect(resume.props.accessibilityHint).toBe(
      `${waiting.puzzle.themeName}, 4 × 4, 0% filled in, 0:45 on the clock`,
    );
    fireEvent.press(resume);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('says so where Continue would be when the saved game cannot be read', () => {
    stage(
      <SetupScreen
        busy={false}
        savedGame={null}
        savedGameDamaged
        onChoose={none}
        onResume={none}
        onBack={none}
      />,
    );

    expect(screen.getByText(/A saved game was found but could not be read/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(button('Advanced')).toBeEnabled();
  });

  it('deadens every choice while the puzzle is being built', () => {
    stage(
      <SetupScreen busy savedGame={savedGame()} onChoose={none} onResume={none} onBack={none} />,
    );

    expect(screen.getByText('Building your puzzle…')).toBeOnTheScreen();
    for (const choice of ['Continue', ...difficulties]) expect(button(choice)).toBeDisabled();
  });
});

describe('the numbered puzzles', () => {
  const advanced = sizeById('sm');
  // The box beside a number is read as the row's checked state. It is a button
  // rather than a checkbox — pressing it starts the game, it does not tick the
  // box — so the state is read off the row rather than through `toBeChecked`.
  const ticked = (name: string) => button(name).props.accessibilityState.checked;

  it('shows the first six, with the way back closed on page one', () => {
    stage(<NumbersScreen size={advanced} busy={false} history={[]} onPlay={none} onBack={none} />);

    expect(header('Play Advanced')).toBeOnTheScreen();
    for (let number = 1; number <= 6; number += 1) {
      expect(button(`Puzzle ${number}`)).toBeEnabled();
      expect(ticked(`Puzzle ${number}`)).toBe(false);
    }
    expect(screen.queryByRole('button', { name: 'Puzzle 7' })).toBeNull();
    expect(button('Previous')).toBeDisabled();
    expect(button('Next')).toBeEnabled();
    expect(button('Back to the difficulties')).toBeEnabled();
  });

  it('ticks a finished puzzle and reads out its time', () => {
    const onPlay = jest.fn();
    stage(
      <NumbersScreen
        size={advanced}
        busy={false}
        history={[game({ seed: 3, seconds: 95 })]}
        onPlay={onPlay}
        onBack={none}
      />,
    );

    expect(ticked('Puzzle 3')).toBe(true);
    expect(button('Puzzle 3').props.accessibilityHint).toBe('Finished in 1:35');
    expect(ticked('Puzzle 2')).toBe(false);

    fireEvent.press(button('Puzzle 2'));
    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('turns the page', () => {
    stage(<NumbersScreen size={advanced} busy={false} history={[]} onPlay={none} onBack={none} />);

    fireEvent.press(button('Next'));
    expect(button('Puzzle 7')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Puzzle 1' })).toBeNull();
    expect(button('Previous')).toBeEnabled();
  });

  it('zooms out to pages of pages, and back in through one of them', () => {
    stage(<NumbersScreen size={advanced} busy={false} history={[]} onPlay={none} onBack={none} />);

    fireEvent.press(button('Zoom out'));
    expect(screen.queryByRole('button', { name: 'Puzzle 1' })).toBeNull();
    for (const first of [1, 7, 13, 19, 25, 31]) {
      expect(button(`Puzzles ${first}–${first + 5}`)).toBeEnabled();
    }
    expect(button('Previous')).toBeDisabled();

    // The groups page the same way the puzzles do.
    fireEvent.press(button('Next'));
    expect(button('Puzzles 37–42')).toBeOnTheScreen();
    fireEvent.press(button('Previous'));

    fireEvent.press(button('Zoom out'));
    expect(button('Puzzles 1–36')).toBeOnTheScreen();
    expect(button('Puzzles 37–72')).toBeOnTheScreen();

    fireEvent.press(button('Puzzles 37–72'));
    expect(button('Puzzles 37–42')).toBeOnTheScreen();
    fireEvent.press(button('Puzzles 43–48'));
    expect(button('Puzzle 43')).toBeOnTheScreen();
    expect(button('Puzzle 48')).toBeOnTheScreen();
    expect(button('Previous')).toBeEnabled();
  });

  it('comes back out to the page that holds the one it left', () => {
    stage(<NumbersScreen size={advanced} busy={false} history={[]} onPlay={none} onBack={none} />);
    for (let turn = 0; turn < 16; turn++) fireEvent.press(button('Next'));
    expect(button('Puzzle 97')).toBeOnTheScreen();

    fireEvent.press(button('Zoom out'));
    expect(button('Puzzles 97–102')).toBeOnTheScreen();
    expect(button('Puzzles 73–78')).toBeOnTheScreen();
  });

  it('stops zooming out at the top, and says how far through a group you are', () => {
    const history = [game({ seed: 2 }), game({ seed: 4 }), game({ seed: 40 })];
    stage(
      <NumbersScreen size={advanced} busy={false} history={history} onPlay={none} onBack={none} />,
    );
    fireEvent.press(button('Zoom out'));
    expect(button('Puzzles 1–6').props.accessibilityHint).toBe('2 of 6 finished');
    expect(screen.getByText('2 of 6 finished')).toBeOnTheScreen();
    expect(button('Puzzles 7–12').props.accessibilityHint).toBe('Opens the pages in this group');

    fireEvent.press(button('Zoom out'));
    expect(button('Puzzles 37–72').props.accessibilityHint).toBe('1 of 36 finished');
    fireEvent.press(button('Zoom out'));
    expect(button('Puzzles 1–216')).toBeOnTheScreen();
    expect(button('Zoom out')).toBeDisabled();
  });

  it('deadens the numbers while a puzzle is being built', () => {
    stage(<NumbersScreen size={advanced} busy history={[]} onPlay={none} onBack={none} />);

    expect(screen.getByText('Building your puzzle…')).toBeOnTheScreen();
    for (let number = 1; number <= 6; number += 1)
      expect(button(`Puzzle ${number}`)).toBeDisabled();
    expect(button('Next')).toBeDisabled();
    expect(button('Zoom out')).toBeDisabled();
  });
});

describe('the daily challenges', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOON }));
  afterEach(() => jest.useRealTimers());

  it('offers one per difficulty', () => {
    const onPlay = jest.fn();
    stage(
      <DailyScreen busy={false} history={[]} onPlay={onPlay} onShowResult={none} onBack={none} />,
    );

    expect(header('Daily challenges')).toBeOnTheScreen();
    for (const difficulty of ['Beginner', 'Advanced', 'Expert', 'Pro']) {
      expect(button(difficulty)).toBeEnabled();
    }

    fireEvent.press(button('Expert'));
    expect(onPlay).toHaveBeenCalledWith(sizeById('md'));
  });

  it('opens the result of one already finished today instead of a board', () => {
    const onPlay = jest.fn();
    const onShowResult = jest.fn();
    const done = game({ seed: dailySeed(new Date(NOON)), seconds: 200, finishedAt: NOON });
    stage(
      <DailyScreen
        busy={false}
        history={[done]}
        onPlay={onPlay}
        onShowResult={onShowResult}
        onBack={none}
      />,
    );

    expect(button('Advanced').props.accessibilityHint).toBe('Done in 3:20 — opens the result');
    fireEvent.press(button('Advanced'));
    expect(onShowResult).toHaveBeenCalledWith(done);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('says how many days running, and only once there are some', () => {
    stage(
      <DailyScreen busy={false} history={[]} onPlay={none} onShowResult={none} onBack={none} />,
    );
    expect(screen.queryByText(/running/)).toBeNull();
    screen.unmount();

    const yesterday = new Date(NOON);
    yesterday.setDate(yesterday.getDate() - 1);
    const history = [
      game({ seed: dailySeed(new Date(NOON)), finishedAt: NOON }),
      game({ seed: dailySeed(yesterday), finishedAt: yesterday.getTime() }),
    ];
    stage(
      <DailyScreen
        busy={false}
        history={history}
        onPlay={none}
        onShowResult={none}
        onBack={none}
      />,
    );
    expect(screen.getByText('2 days running')).toBeOnTheScreen();
  });

  it('deadens the four while one is being built', () => {
    stage(<DailyScreen busy history={[]} onPlay={none} onShowResult={none} onBack={none} />);

    for (const difficulty of ['Beginner', 'Advanced', 'Expert', 'Pro']) {
      expect(button(difficulty)).toBeDisabled();
    }
  });
});

describe('the board', () => {
  const puzzle = puzzleOne();

  // The clock ticks and the board autosaves on timers; neither should be
  // allowed to run on while a test reads the screen.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function play(restore: ReturnType<typeof savedGame> | null = null, { disk = true } = {}) {
    const onSaveProgress = jest.fn(async (_game: SavedGame) => disk);
    const onDiscardProgress = jest.fn();
    const onExit = jest.fn();
    stage(
      <GameScreen
        puzzle={puzzle}
        autoEliminate
        autoFacts
        accent={DEFAULT_SETTINGS.accent}
        onToggleAutoEliminate={none}
        onToggleAutoFacts={none}
        onChangeAccent={none}
        restore={restore}
        onExit={onExit}
        onSaveProgress={onSaveProgress}
        onDiscardProgress={onDiscardProgress}
        onCompleted={() => Promise.reject(new Error('nothing is finished here'))}
      />,
    );
    return { onSaveProgress, onDiscardProgress, onExit };
  }

  /** The board is drawn once it knows how much room it has. */
  function layOut() {
    const measured = screen.UNSAFE_getAllByType(View).find((view) => view.props.onLayout);
    if (!measured) throw new Error('nothing on the screen measures itself');
    fireEvent(measured, 'layout', { nativeEvent: { layout: { width: 390, height: 520 } } });
  }

  it('opens on the briefing, over a board with nothing to undo or light up', () => {
    play();

    expect(header(puzzle.themeName)).toBeOnTheScreen();
    expect(screen.getByText(`#${puzzle.seed}`)).toBeOnTheScreen();
    // The story comes first; the one button on it puts it away.
    expect(button('Close')).toBeEnabled();

    expect(button('Menu')).toBeEnabled();
    expect(button('Undo')).toBeDisabled();
    expect(button('Clue')).toBeEnabled();
    expect(button('Info')).toBeEnabled();
    expect(button('Highlight')).toBeDisabled();
    expect(button('Zoom out')).toBeDisabled();
    expect(button('Zoom in')).toBeEnabled();
    expect(button('Back to setup')).toBeEnabled();
  });

  it('draws every square of the staircase once it has been measured', () => {
    play();
    layOut();

    // A 4 × 4 puzzle is six grids of sixteen squares, every one of them a
    // button that says what it is.
    const squares = screen.getAllByRole('button', { name: /: unknown$/ });
    expect(squares).toHaveLength(6 * 16);
    // Every item heads a row or a column somewhere on the staircase — most of
    // them more than once — and each of those headings opens its card.
    for (const category of puzzle.categories) {
      for (const item of category.items) {
        const headings = screen.getAllByRole('button', { name: `About ${item.label}` });
        expect(headings.length).toBeGreaterThan(0);
        for (const heading of headings) expect(heading).toBeEnabled();
      }
    }
  });

  it('says why it will not take a mark before the first clue', () => {
    play();
    fireEvent.press(button('Close'));
    layOut();

    const [square] = screen.getAllByRole('button', { name: /: unknown$/ });
    fireEvent.press(square);
    expect(
      screen.getByText('Nothing to go on yet — tap Clue for the first one.'),
    ).toBeOnTheScreen();
    // Refused, not marked.
    expect(square.props.accessibilityLabel).toMatch(/unknown$/);

    // Said every time, since it answers a thing the player just did.
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/Nothing to go on/)).toBeNull();
    fireEvent.press(square);
    expect(
      screen.getByText('Nothing to go on yet — tap Clue for the first one.'),
    ).toBeOnTheScreen();

    // And stops the moment there is something to go on.
    fireEvent.press(button('Clue'));
    fireEvent.press(button('Close'));
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    fireEvent.press(square);
    expect(screen.queryByText(/Nothing to go on/)).toBeNull();
    expect(square.props.accessibilityLabel).toMatch(/ruled out$/);
  });

  it('hands over the first clue on Clue, and lights Highlight up behind it', () => {
    play();
    fireEvent.press(button('Close'));

    fireEvent.press(button('Clue'));
    expect(screen.getByLabelText('Clue in play')).toBeOnTheScreen();
    expect(screen.getByText('1 of 1')).toBeOnTheScreen();
    // Nothing before the first clue; Next is never closed, since past the
    // last one read it asks for another.
    expect(button('Previous')).toBeDisabled();
    expect(button('Next')).toBeEnabled();

    fireEvent.press(button('Close'));
    expect(button('Highlight')).toBeEnabled();
  });

  it('does not re-introduce a game picked back up', () => {
    play(savedGame(puzzle));

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(button('Highlight')).toBeEnabled();
  });

  it('picks the undo stack back up with the game', () => {
    const { onSaveProgress } = play({ ...savedGame(puzzle), history: [{}] });
    layOut();

    expect(button('Undo')).toBeEnabled();
    fireEvent.press(button('Undo'));
    expect(button('Undo')).toBeDisabled();

    // And what is saved carries the stack on: one move makes one board to go
    // back to.
    const [square] = screen.getAllByRole('button', { name: /: unknown$/ });
    fireEvent.press(square);
    screen.unmount();
    const last = onSaveProgress.mock.calls.at(-1)?.[0];
    expect(last?.history).toEqual([{}]);
  });

  it('saves a started board on the way out', () => {
    const { onSaveProgress, onExit } = play();
    fireEvent.press(button('Close'));
    fireEvent.press(button('Clue'));
    fireEvent.press(button('Close'));
    fireEvent.press(button('Back to setup'));
    expect(onExit).toHaveBeenCalledTimes(1);

    screen.unmount();
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ puzzle, marks: {}, clueIndex: 0, cluesSeen: [0] }),
    );
  });

  it('leaves nothing behind for a board nobody has started', () => {
    const { onSaveProgress, onDiscardProgress } = play();
    fireEvent.press(button('Close'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    fireEvent.press(button('Back to setup'));
    screen.unmount();

    expect(onSaveProgress).not.toHaveBeenCalled();
    expect(onDiscardProgress).toHaveBeenCalled();
  });

  it('clears the saved game when a started one is put back to the beginning', async () => {
    const { onSaveProgress, onDiscardProgress } = play({
      ...savedGame(puzzle),
      seconds: 90,
      cluesSeen: [0, 1],
      clueIndex: 1,
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onSaveProgress).toHaveBeenCalled();
    onSaveProgress.mockClear();

    fireEvent.press(button('Menu'));
    fireEvent.press(button('Restart puzzle'));
    fireEvent.press(button('Restart it'));
    expect(onDiscardProgress).toHaveBeenCalled();

    // And leaving does not write the empty board back.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    fireEvent.press(button('Back to setup'));
    screen.unmount();
    expect(onSaveProgress).not.toHaveBeenCalled();
  });

  it('says once, quietly, when the board is not being saved', async () => {
    play(null, { disk: false });
    fireEvent.press(button('Close'));
    layOut();
    // Nothing is saved before the first clue, so read one.
    fireEvent.press(button('Clue'));
    fireEvent.press(button('Close'));

    // The first autosave, 600ms after the board settles.
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(
      screen.getByText('Progress is not being saved — the device may be out of space.'),
    ).toBeOnTheScreen();

    // Said once: the line clears after a moment and a later failed save does
    // not bring it back.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/not being saved/)).toBeNull();
    const [square] = screen.getAllByRole('button', { name: /: unknown$/ });
    fireEvent.press(button('Clue'));
    fireEvent.press(button('Close'));
    fireEvent.press(square);
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(screen.queryByText(/not being saved/)).toBeNull();
  });

  it('opens the puzzle settings from the burger and comes back from them', () => {
    play();
    fireEvent.press(button('Close'));

    fireEvent.press(button('Menu'));
    expect(header('Puzzle settings')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Clue' })).toBeNull();

    fireEvent.press(button('Back to the board'));
    expect(button('Clue')).toBeEnabled();
  });
});

describe('the puzzle settings', () => {
  const puzzle = puzzleOne();

  it('shows the board pair as they stand, the colour, and the way to start over', () => {
    const onToggleAutoFacts = jest.fn();
    stage(
      <GameMenuScreen
        puzzle={puzzle}
        autoEliminate
        autoFacts={false}
        accent={DEFAULT_SETTINGS.accent}
        onChangeAccent={none}
        onToggleAutoEliminate={none}
        onToggleAutoFacts={onToggleAutoFacts}
        onRestart={none}
        onClose={none}
      />,
    );

    expect(header('Puzzle settings')).toBeOnTheScreen();
    expect(header('This puzzle')).toBeOnTheScreen();
    expect(checkbox('Automatic crosses')).toBeChecked();
    expect(checkbox('Auto add facts')).not.toBeChecked();
    expect(button('Colour')).toBeEnabled();

    fireEvent.press(checkbox('Auto add facts'));
    expect(onToggleAutoFacts).toHaveBeenCalledTimes(1);
  });

  it('asks before throwing a board away', () => {
    const onRestart = jest.fn();
    stage(
      <GameMenuScreen
        puzzle={puzzle}
        autoEliminate
        autoFacts
        accent={DEFAULT_SETTINGS.accent}
        onChangeAccent={none}
        onToggleAutoEliminate={none}
        onToggleAutoFacts={none}
        onRestart={onRestart}
        onClose={none}
      />,
    );

    expect(screen.queryByText('Restart this puzzle?')).toBeNull();
    fireEvent.press(button('Restart puzzle'));
    expect(onRestart).not.toHaveBeenCalled();
    expect(screen.getByText('Restart this puzzle?')).toBeOnTheScreen();

    fireEvent.press(button('Restart it'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

describe('a finished game, read back', () => {
  it('builds the answer again from the seed', () => {
    const onBack = jest.fn();
    const puzzle = puzzleOne();
    stage(<ResultScreen game={game({ seed: 1, seconds: 125, cluesUsed: 7 })} onBack={onBack} />);

    expect(screen.getByText('Solved!')).toBeOnTheScreen();
    // The name and the table come from the puzzle the seed builds, not from
    // whatever the record says it was.
    expect(screen.getByText(`${puzzle.themeName} · 4 × 4`)).toBeOnTheScreen();
    expect(screen.getByText('2:05')).toBeOnTheScreen();
    expect(screen.getByText('7')).toBeOnTheScreen();
    for (const item of puzzle.categories[0].items) {
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0);
    }

    fireEvent.press(button('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers to share it, by date and without the answer', () => {
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    stage(
      <ResultScreen
        game={game({ seed: 20260902, seconds: 125, cluesUsed: 7, finishedAt: NOON })}
        onBack={none}
      />,
    );

    fireEvent.press(button('Share'));
    expect(sheet).toHaveBeenCalledTimes(1);
    const { message } = sheet.mock.calls[0][0] as { message: string };
    expect(message).toContain('Daily, 2 September 2026');
    expect(message).toContain('2:05 · 7 clues');
    expect(message).toContain('🟩');
    for (const item of puzzleOne('sm', 20260902).categories[0].items) {
      expect(message).not.toContain(item.label);
    }
    sheet.mockRestore();
  });
});

describe('the settings', () => {
  it('shows every setting as it stands', () => {
    const onChange = jest.fn();
    stage(<SettingsScreen settings={DEFAULT_SETTINGS} onChange={onChange} onBack={none} />);

    expect(header('Settings')).toBeOnTheScreen();
    expect(checkbox('Automatic crosses')).toBeChecked();
    expect(checkbox('Auto add facts')).toBeChecked();
    expect(checkbox('Match the device')).toBeChecked();
    expect(checkbox('Vibration')).toBeChecked();
    expect(button('Colour')).toBeEnabled();
    expect(screen.getByLabelText('Volume')).toHaveAccessibilityValue({ text: 'Medium' });

    fireEvent.press(checkbox('Automatic crosses'));
    expect(onChange).toHaveBeenCalledWith({ autoEliminate: false });
  });

  it('leaves the night switch to the device while the device is deciding', () => {
    stage(<SettingsScreen settings={DEFAULT_SETTINGS} onChange={none} onBack={none} />);
    expect(checkbox('Night colours')).toBeDisabled();
  });

  it('hands the night switch back once the player takes over', () => {
    const onChange = jest.fn();
    stage(
      <SettingsScreen
        settings={{ ...DEFAULT_SETTINGS, colours: 'night' }}
        onChange={onChange}
        onBack={none}
      />,
      { scheme: 'night' },
    );

    expect(checkbox('Match the device')).not.toBeChecked();
    expect(checkbox('Night colours')).toBeEnabled();
    expect(checkbox('Night colours')).toBeChecked();

    fireEvent.press(checkbox('Night colours'));
    expect(onChange).toHaveBeenCalledWith({ colours: 'day' });
  });
});

describe('the statistics', () => {
  it('says so when there is nothing to show, and offers nothing to clear', () => {
    stage(<StatsScreen stats={statsOf([])} history={[]} onBack={none} onClearHistory={none} />);

    expect(header('Statistics')).toBeOnTheScreen();
    expect(screen.getByText('No finished puzzles yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Clear statistics' })).toBeNull();
    expect(button('Back')).toBeEnabled();
  });

  it('says so when the history on the device cannot be read', () => {
    stage(
      <StatsScreen
        stats={statsOf([])}
        history={[]}
        historyDamaged
        onBack={none}
        onClearHistory={none}
      />,
    );

    expect(screen.getByText(/could not be read/)).toBeOnTheScreen();
    expect(screen.getByText('No finished puzzles yet')).toBeOnTheScreen();
  });

  it('totals a history, one tab per difficulty played, and asks before clearing it', () => {
    const history = [
      game({ seed: 3, finishedAt: NOON }),
      game({ seed: 2, sizeId: 'md', sizeLabel: '5 × 4', difficulty: 'Expert', seconds: 300 }),
      game({ seed: 1, seconds: 100, finishedAt: NOON - 86_400_000 }),
    ];
    const onClearHistory = jest.fn();
    stage(
      <StatsScreen
        stats={statsOf(history)}
        history={history}
        onBack={none}
        onClearHistory={onClearHistory}
      />,
    );

    // Once as a tile, once as a column of the table by difficulty.
    expect(screen.getAllByText('Solved')).toHaveLength(2);
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Advanced' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Expert' })).not.toBeSelected();
    expect(screen.queryByRole('tab', { name: 'Beginner' })).toBeNull();

    fireEvent.press(button('Clear statistics'));
    expect(onClearHistory).not.toHaveBeenCalled();
    expect(screen.getByText('Clear statistics?')).toBeOnTheScreen();
    expect(button('Keep them')).toBeEnabled();
    // The window's own button says the same words as the one that opened it.
    const [, confirm] = screen.getAllByRole('button', { name: 'Clear statistics' });
    fireEvent.press(confirm);
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });
});
