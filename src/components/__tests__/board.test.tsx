import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import { GridBoard } from '../GridBoard';
import { lessonById } from '../../game/lessons';
import { stage } from '../../screens/__tests__/stage';

const CELL = 40;
const puzzle = lessonById('deduction').puzzle;
/** One grid of squares, plus the rule drawn either side of it. */
const BLOCK = CELL * puzzle.size.items + 4;

function board(onSettle?: (cell: unknown) => void) {
  stage(
    <GridBoard
      puzzle={puzzle}
      marks={{}}
      mistakes={new Set()}
      highlight={[]}
      cellSize={CELL}
      onToggle={() => {}}
      onSettle={onSettle}
      onInspect={() => {}}
    />,
  );
  return screen.UNSAFE_getAllByType(ScrollView);
}

/** One square, by the two items it names. */
const square = (row: number, col: number) =>
  screen.getByRole('button', {
    name: new RegExp(
      `^${puzzle.categories[0].items[row].label} and ${puzzle.categories[1].items[col].label}: `,
    ),
  });

/**
 * The board slides under its own headings, which is three scrollers: the
 * headings across the top, the grids, and the up-and-down one the grids and the
 * row headings share. What each is asked to do cannot be seen from a browser —
 * `snapToInterval` is a native prop, and react-native-web drops it — so this is
 * what holds the instructions to still being given.
 */
describe('the board and its headings', () => {
  it('gives the column headings a scroller with no finger on it', () => {
    const [headings] = board();
    expect(headings.props.horizontal).toBe(true);
    expect(headings.props.scrollEnabled).toBe(false);
  });

  it('slides a whole grid at a time, both ways', () => {
    const scrollers = board();
    // The headings scroller is driven, so it is the other two that snap.
    const snapping = scrollers.filter((view) => view.props.snapToInterval !== undefined);
    expect(snapping).toHaveLength(2);

    for (const view of snapping) {
      expect(view.props.snapToInterval).toBe(BLOCK);
      expect(view.props.snapToAlignment).toBe('start');
      // Without this a flick coasts past the snap points rather than into one.
      expect(view.props.decelerationRate).toBe('fast');
    }

    // One of each: the grids sideways, and the grids with the row headings down.
    expect(snapping.filter((view) => view.props.horizontal === true)).toHaveLength(1);
    expect(snapping.filter((view) => !view.props.horizontal)).toHaveLength(1);
  });

  it('drives the headings from the grid, so the two cannot come apart', () => {
    const scrollers = board();
    const grids = scrollers.find(
      (view) => view.props.horizontal === true && view.props.snapToInterval !== undefined,
    );
    expect(grids?.props.onScroll).toEqual(expect.any(Function));
    expect(grids?.props.scrollEventThrottle).toBe(16);
  });

  /**
   * Both headings are still there to be pressed. Every set on the staircase but
   * the first and the last heads a row *and* a column, so most items appear
   * twice.
   */
  it('keeps every heading a way into the item behind it', () => {
    board();
    for (const category of puzzle.categories) {
      for (const item of category.items) {
        expect(
          screen.getAllByRole('button', { name: `About ${item.label}` }).length,
        ).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The board's second way of ticking a square. A tap cycles — blank, cross,
 * tick, blank — which puts the mark a puzzle is won with two taps out of the
 * way; holding says it in one, from wherever the square was.
 */
describe('holding a square down', () => {
  it('hands the square to whoever is listening for it', () => {
    const onSettle = jest.fn();
    board(onSettle);

    fireEvent(square(0, 1), 'longPress');
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledWith({ c1: 0, i1: 0, c2: 1, i2: 1 });
  });

  /**
   * A gesture is the one thing a screen reader cannot make, so the same thing
   * is offered as an action on the square — which is where VoiceOver looks for
   * the second thing a control does.
   */
  it('offers the same thing as an action, for a finger that cannot hold', () => {
    const onSettle = jest.fn();
    board(onSettle);

    const cell = square(2, 0);
    expect(cell.props.accessibilityActions).toEqual([{ name: 'settle', label: 'Tick it' }]);
    fireEvent(cell, 'accessibilityAction', { nativeEvent: { actionName: 'settle' } });
    expect(onSettle).toHaveBeenCalledWith({ c1: 0, i1: 2, c2: 1, i2: 0 });
  });

  it('says nothing about an action it cannot carry out', () => {
    board();
    expect(square(0, 0).props.accessibilityActions).toBeUndefined();
    expect(square(0, 0).props.onLongPress).toBeUndefined();
  });
});
