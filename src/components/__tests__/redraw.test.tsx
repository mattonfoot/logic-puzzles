import { act } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { byHand, markKey, type Cell, type Marks } from '../../game/board';
import { lessonById } from '../../game/lessons';
import { ThemeProvider } from '../../ui/ThemeProvider';
import { DEFAULT_SETTINGS } from '../../game/settings';
import { stage } from '../../screens/__tests__/stage';
import { GridBoard } from '../GridBoard';

/** Every mark drawn, counted — a mark is drawn by the square it sits in. */
let mockDrawn = 0;
jest.mock('../Mark', () => {
  const actual = jest.requireActual('../Mark');
  return {
    ...actual,
    Mark: (props: object) => {
      mockDrawn++;
      return actual.Mark(props);
    },
  };
});

const puzzle = lessonById('deduction').puzzle;
const cell = (i1: number, i2: number): Cell => ({ c1: 0, i1, c2: 1, i2 });
const onToggle = () => {};
const onInspect = () => {};
const none = new Set<string>();
const nothingLit: never[] = [];

function board(marks: Marks) {
  return (
    <GridBoard
      puzzle={puzzle}
      marks={marks}
      mistakes={none}
      highlight={nothingLit}
      cellSize={40}
      onToggle={onToggle}
      onInspect={onInspect}
    />
  );
}

/**
 * A board is up to 216 squares, and a move changes one of them. Each square
 * is drawn from plain values, so the ones a move does not touch are left as
 * they are rather than drawn again.
 */
it('redraws only the square a move lands on', () => {
  const marks: Marks = {
    [markKey(cell(0, 0))]: byHand('yes'),
    [markKey(cell(1, 1))]: byHand('no'),
    [markKey(cell(2, 2))]: byHand('no'),
  };
  const { rerender } = stage(board(marks));
  expect(mockDrawn).toBe(3);

  mockDrawn = 0;
  act(() =>
    rerender(
      <SafeAreaProvider>
        <ThemeProvider preference="day" accent={DEFAULT_SETTINGS.accent}>
          {board({ ...marks, [markKey(cell(0, 1))]: byHand('no') })}
        </ThemeProvider>
      </SafeAreaProvider>,
    ),
  );
  expect(mockDrawn).toBe(1);
});
