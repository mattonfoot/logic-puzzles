import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { SavedGame } from './persistence';

interface Options {
  /**
   * Whether there is a game here worth keeping. Before the first clue there is
   * nothing on the board and no clock running — Restart puts it back to exactly
   * that — and a save of it would only put a Continue on the setup screen with
   * nothing behind it, so the slot is cleared instead.
   */
  started: boolean;
  /** A finished game is recorded rather than saved, and nothing here touches it. */
  solved: boolean;
  /** Resolves false when the board could not be written. */
  onSave: (game: SavedGame) => Promise<boolean>;
  onDiscard: () => void;
  /** A save did not land, the first time since the last one that did. */
  onFailed: () => void;
}

/**
 * Keeps a game in progress on disk: shortly after every change, so closing the
 * app mid-puzzle loses nothing worth keeping, and straight away when the app
 * goes to the background or the screen goes.
 *
 * `snapshot` is read when a save is made rather than when it is scheduled, so
 * it is whatever the board says at that moment; `changed` is anything that
 * moves whenever the game does.
 */
export function useAutosave(
  snapshot: () => SavedGame,
  changed: unknown,
  { started, solved, onSave, onDiscard, onFailed }: Options,
): void {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const state = useRef({ started, solved });
  state.current = { started, solved };
  // Set once the player has been told a save failed, so it is said once rather
  // than after every move; cleared by a save that lands, so a later failure is
  // news again.
  const warned = useRef(false);

  const keep = useCallback(() => {
    if (state.current.solved) return;
    if (state.current.started) void onSave(latest.current());
    else onDiscard();
  }, [onDiscard, onSave]);

  useEffect(() => {
    if (solved) return;
    if (!started) {
      // Restart lands here with the old board still on disk; a fresh puzzle
      // lands here with nothing there, and clearing nothing costs nothing.
      onDiscard();
      return;
    }
    const timer = setTimeout(() => {
      void onSave(latest.current()).then((landed) => {
        if (landed) {
          warned.current = false;
        } else if (!warned.current) {
          warned.current = true;
          onFailed();
        }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [changed, solved, started, onSave, onDiscard, onFailed]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') keep();
    });
    return () => {
      subscription.remove();
      keep();
    };
  }, [keep]);
}
