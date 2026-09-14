import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { GridBoard, MAX_CELL, MIN_CELL, numberSize, widestNumber } from '../GridBoard';
import { lessonById } from '../../game/lessons';
import { puzzleOne, stage } from '../../screens/__tests__/stage';

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

/**
 * The one set whose items are already numbers. Everything else on the board is
 * headed by its drawing; a year, a depth or a price is headed by the number
 * itself, because fourteen pictures of a stack of discs differ only by how many
 * discs are in the stack and nobody counts discs at the size a heading gets.
 */
describe('an ordered set on the board', () => {
  /** An Expert puzzle, which is four sets — one of them always the ordered one. */
  const numbered = puzzleOne('md');
  const ordered = numbered.categories.find((category) => category.ordered);

  function grid() {
    stage(
      <GridBoard
        puzzle={numbered}
        marks={{}}
        mistakes={new Set()}
        highlight={[]}
        cellSize={CELL}
        onToggle={() => {}}
        onSettle={undefined}
        onInspect={() => {}}
      />,
    );
  }

  /** Every heading the given item has, on whichever edges it sits. */
  const headingsFor = (label: string) => screen.getAllByRole('button', { name: `About ${label}` });

  it('heads its items with the number they compare by', () => {
    expect(ordered).toBeDefined();
    grid();

    for (const item of ordered!.items) {
      expect(item.value).toEqual(expect.any(Number));
      for (const heading of headingsFor(item.label)) {
        expect(within(heading).getByText(String(item.value))).toBeOnTheScreen();
      }
    }
  });

  /**
   * The unit is said once, down the side of the block, rather than fourteen
   * times inside squares with no room for it: "215", not "215cm". The label in
   * full is still what the heading is called and what its card is headed by.
   */
  it('leaves the unit to the set name beside it', () => {
    const units = ordered!.items.filter((item) => item.label !== String(item.value));
    // Not every scale carries one — a launch year is written as its number.
    if (units.length === 0) return;
    grid();

    for (const item of units) {
      for (const heading of headingsFor(item.label)) {
        expect(within(heading).getByText(String(item.value))).toBeOnTheScreen();
        expect(within(heading).queryByText(item.label)).toBeNull();
      }
    }
  });

  /**
   * A set is one thing, so it is set in one size — the size its longest number
   * needs. "35" drawn larger than the "185" beside it reads as emphasis rather
   * than as the shorter number it is.
   */
  it('sets the whole scale in one size', () => {
    grid();

    const sizes = new Set<number>();
    for (const item of ordered!.items) {
      for (const heading of headingsFor(item.label)) {
        const digits = within(heading).getByText(String(item.value));
        sizes.add(StyleSheet.flatten(digits.props.style).fontSize);
      }
    }
    expect(sizes.size).toBe(1);
    expect([...sizes][0]).toBe(numberSize(Math.round(CELL * 0.94), widestNumber(ordered!.items)));
  });

  /** Every other set keeps its drawing, which carries no text at all. */
  it('leaves the drawn sets drawn', () => {
    grid();

    for (const category of numbered.categories) {
      if (category.ordered) continue;
      for (const item of category.items) {
        for (const heading of headingsFor(item.label)) {
          expect(within(heading).queryAllByText(/\S/)).toHaveLength(0);
        }
      }
    }
  });
});

/**
 * A number is set as large as its square will take it, which is a size that
 * depends on how many digits it has: a bill of "9" gets the whole square and a
 * launch year of "2031" gets a quarter of it each.
 */
describe('sizing the digits of a heading', () => {
  it('gives a shorter number a larger face', () => {
    expect(numberSize(40, 2)).toBeGreaterThan(numberSize(40, 3));
    expect(numberSize(40, 3)).toBeGreaterThan(numberSize(40, 4));
  });

  /**
   * Up to the point where it would be taller than it is wide. One digit with a
   * square to itself is held to the same height as two, so a bill of "9" and a
   * bill of "17" are set in the same face rather than one of them shouting.
   */
  it('holds a short number to the height the square allows', () => {
    expect(numberSize(40, 1)).toBe(numberSize(40, 2));
  });

  it('never sets a number taller than the square it stands in', () => {
    for (let box = MIN_CELL; box <= MAX_CELL; box++) {
      for (let digits = 1; digits <= 4; digits++) {
        const size = numberSize(box, digits);
        expect(size).toBeLessThanOrEqual(box);
        // And the digits, all of one width, stay inside it across as well —
        // unless the number has bottomed out at the smallest readable size,
        // which is the one case allowed to fill the square to its edges.
        if (size > 7) expect(size * digits * 0.64).toBeLessThanOrEqual(box);
      }
    }
  });

  it('stops shrinking where a number stops being readable', () => {
    expect(numberSize(4, 9)).toBe(7);
  });

  it('measures a set by its longest number', () => {
    const scale = [35, 65, 110, 185].map((value) => ({ value }) as never);
    expect(widestNumber(scale)).toBe(3);
    // A set with nothing to print is never sized, but never divides by nothing.
    expect(widestNumber([])).toBe(1);
  });
});
