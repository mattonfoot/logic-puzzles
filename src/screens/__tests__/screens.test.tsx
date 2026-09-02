import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

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
    stage(<StartScreen onDaily={none} onPlay={onPlay} onOpenSettings={none} onOpenStats={none} />);

    for (const door of ['Daily', 'Play', 'Settings', 'Statistics']) {
      expect(button(door)).toBeEnabled();
    }

    fireEvent.press(button('Play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
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

  it('deadens the numbers while a puzzle is being built', () => {
    stage(<NumbersScreen size={advanced} busy history={[]} onPlay={none} onBack={none} />);

    expect(screen.getByText('Building your puzzle…')).toBeOnTheScreen();
    for (let number = 1; number <= 6; number += 1)
      expect(button(`Puzzle ${number}`)).toBeDisabled();
    expect(button('Next')).toBeDisabled();
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
        onCompleted={() => Promise.reject(new Error('nothing is finished here'))}
      />,
    );
    return { onSaveProgress, onExit };
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

  it('saves the board on the way out', () => {
    const { onSaveProgress, onExit } = play();
    fireEvent.press(button('Back to setup'));
    expect(onExit).toHaveBeenCalledTimes(1);

    screen.unmount();
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ puzzle, marks: {}, clueIndex: null }),
    );
  });

  it('says once, quietly, when the board is not being saved', async () => {
    play(null, { disk: false });
    fireEvent.press(button('Close'));
    layOut();

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
