import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { puzzleOne, savedGame, stage } from '../../screens/__tests__/stage';
import { storage } from '../../storage/store';
import { Text } from '../Text';
import { Boundary } from '../Boundary';

/** A screen that throws while drawing, until told to stop. */
const fuse = { lit: true };
function Bomb() {
  if (fuse.lit) throw new Error('the board ate itself');
  return <Text>The front door</Text>;
}

describe('the error boundary', () => {
  let quiet: jest.SpyInstance;
  beforeEach(() => {
    fuse.lit = true;
    // React reports a caught throw on the console as well as to the boundary;
    // the test is about the boundary.
    quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => quiet.mockRestore());

  it('shows a page with two ways out instead of nothing', () => {
    stage(
      <Boundary>
        <Bomb />
      </Boundary>,
    );

    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back to the start' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard the saved game' })).toBeEnabled();
    expect(screen.getByText('The error was: the board ate itself')).toBeOnTheScreen();
  });

  it('starts the app over from the front door, keeping the saved game', async () => {
    const waiting = savedGame(puzzleOne());
    await storage.saveGame(waiting);
    stage(
      <Boundary>
        <Bomb />
      </Boundary>,
    );

    fuse.lit = false;
    fireEvent.press(screen.getByRole('button', { name: 'Back to the start' }));

    expect(screen.getByText('The front door')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Something went wrong' })).toBeNull();
    await expect(storage.loadSavedGame()).resolves.toEqual(waiting);
  });

  it('throws the saved game away on the other way out, and nothing else', async () => {
    await storage.saveGame(savedGame(puzzleOne()));
    stage(
      <Boundary>
        <Bomb />
      </Boundary>,
    );

    fuse.lit = false;
    fireEvent.press(screen.getByRole('button', { name: 'Discard the saved game' }));

    await waitFor(() => expect(screen.getByText('The front door')).toBeOnTheScreen());
    await expect(storage.loadSavedGame()).resolves.toBeNull();
  });

  it('catches a second throw after starting over', () => {
    stage(
      <Boundary>
        <Bomb />
      </Boundary>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Back to the start' }));
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
  });
});
