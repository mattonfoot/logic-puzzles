import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SIZES } from '../data/sizes';
import { summarise, improvementFor, type Improvement, type OverallStats } from '../stats/summary';
import { storage } from '../storage/store';
import {
  appendGame,
  completedGameFrom,
  EMPTY_HISTORY,
  type CompletedGame,
  type History,
  type SavedGame,
} from './persistence';
import type { Puzzle } from '../puzzle/types';

export interface CompletionInput {
  seconds: number;
  /** How many of the puzzle's clues the player read. */
  cluesUsed: number;
  revealed: boolean;
}

export interface Persistence {
  /** False until the first read from disk has finished. */
  ready: boolean;
  savedGame: SavedGame | null;
  history: CompletedGame[];
  stats: OverallStats;
  saveProgress: (game: SavedGame) => void;
  discardSavedGame: () => void;
  /** Records a finished game and returns how it compares with the earlier ones. */
  recordCompletion: (puzzle: Puzzle, input: CompletionInput) => Promise<Improvement>;
  clearHistory: () => void;
}

/**
 * Owns everything that survives a restart: the game in progress and the list of
 * finished games. Writes are fire-and-forget so nothing in the UI waits on disk.
 */
export function usePersistence(): Persistence {
  const [ready, setReady] = useState(false);
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  // Mirrors `history` so a completion can read the latest list without waiting
  // for a render, and without doing work inside a state updater.
  const historyRef = useRef<History>(EMPTY_HISTORY);

  useEffect(() => {
    let active = true;
    (async () => {
      const [saved, stored] = await Promise.all([storage.loadSavedGame(), storage.loadHistory()]);
      if (!active) return;
      setSavedGame(saved);
      historyRef.current = stored;
      setHistory(stored);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveProgress = useCallback((game: SavedGame) => {
    setSavedGame(game);
    void storage.saveGame(game);
  }, []);

  const discardSavedGame = useCallback(() => {
    setSavedGame(null);
    void storage.clearSavedGame();
  }, []);

  const recordCompletion = useCallback(
    async (puzzle: Puzzle, input: CompletionInput): Promise<Improvement> => {
      const game = completedGameFrom(puzzle, { ...input, finishedAt: Date.now() });
      const previous = historyRef.current;
      const improvement = improvementFor(game, previous.games);

      const next = appendGame(previous, game);
      historyRef.current = next;
      setHistory(next);
      setSavedGame(null);

      await Promise.all([storage.saveHistory(next), storage.clearSavedGame()]);
      return improvement;
    },
    [],
  );

  const clearHistory = useCallback(() => {
    historyRef.current = EMPTY_HISTORY;
    setHistory(EMPTY_HISTORY);
    void storage.clearHistory();
  }, []);

  const stats = useMemo(() => summarise(history.games, SIZES), [history.games]);

  return {
    ready,
    savedGame,
    history: history.games,
    stats,
    saveProgress,
    discardSavedGame,
    recordCompletion,
    clearHistory,
  };
}
