import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SIZES } from '../data/sizes';
import { summarise, improvementFor, type Improvement, type OverallStats } from '../stats/summary';
import { storage, valueOf } from '../storage/store';
import {
  appendGame,
  completedGameFrom,
  EMPTY_HISTORY,
  EMPTY_WALKED,
  withWalked,
  type CompletedGame,
  type History,
  type SavedGame,
  type WalkedLessons,
} from './persistence';
import type { Puzzle } from '../puzzle/types';

export interface CompletionInput {
  seconds: number;
  /** How many of the puzzle's clues the player read. */
  cluesUsed: number;
  /** And how many times they asked one what was wrong with the board. */
  hintsAsked: number;
  /**
   * How the board was arrived at rather than how long it took: marks taken
   * back, times rewound, whether it ever contradicted itself, when it was
   * opened and whether it was put down on the way. Measured by the board, which
   * is the only screen that can see any of it.
   */
  undos: number;
  rewinds: number;
  conflicted: boolean;
  startedAt: number;
  resumed: boolean;
  revealed: boolean;
}

/** A finished game recorded: how it compares, and whether that record landed. */
export interface Completion {
  improvement: Improvement;
  /** False when the history could not be written, so the game is not in it. */
  recorded: boolean;
}

export interface Persistence {
  /** False until the first read from disk has finished. */
  ready: boolean;
  savedGame: SavedGame | null;
  /** There is a saved game on the device, and it could not be read. */
  savedGameDamaged: boolean;
  history: CompletedGame[];
  /** There is a history on the device, and it could not be read. */
  historyDamaged: boolean;
  stats: OverallStats;
  /** Which lessons have been walked to the end, ever. */
  lessonsWalked: string[];
  /** Notes one as walked. The tutorial never reads this back. */
  recordLessonWalked: (lesson: string) => void;
  /** Writes the board; resolves false when the write did not land. */
  saveProgress: (game: SavedGame) => Promise<boolean>;
  discardSavedGame: () => void;
  /** Records a finished game and returns how it compares with the earlier ones. */
  recordCompletion: (puzzle: Puzzle, input: CompletionInput) => Promise<Completion>;
  clearHistory: () => void;
}

/**
 * Owns everything that survives a restart: the game in progress and the list of
 * finished games. Writes are fire-and-forget so nothing in the UI waits on disk.
 */
export function usePersistence(): Persistence {
  const [ready, setReady] = useState(false);
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [savedGameDamaged, setSavedGameDamaged] = useState(false);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [historyDamaged, setHistoryDamaged] = useState(false);
  const [walked, setWalked] = useState<WalkedLessons>(EMPTY_WALKED);
  const walkedRef = useRef<WalkedLessons>(EMPTY_WALKED);
  // Mirrors `history` so a completion can read the latest list without waiting
  // for a render, and without doing work inside a state updater.
  const historyRef = useRef<History>(EMPTY_HISTORY);

  useEffect(() => {
    let active = true;
    (async () => {
      const [saved, stored, lessons] = await Promise.all([
        storage.loadSavedGame(),
        storage.loadHistory(),
        storage.loadWalked(),
      ]);
      if (!active) return;
      const walkedSoFar = valueOf(lessons) ?? EMPTY_WALKED;
      walkedRef.current = walkedSoFar;
      setWalked(walkedSoFar);
      setSavedGame(valueOf(saved));
      setSavedGameDamaged(saved.kind === 'damaged');
      const games = valueOf(stored) ?? EMPTY_HISTORY;
      historyRef.current = games;
      setHistory(games);
      setHistoryDamaged(stored.kind === 'damaged');
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveProgress = useCallback((game: SavedGame) => {
    setSavedGame(game);
    // Whatever was unreadable under the key has just been written over.
    setSavedGameDamaged(false);
    return storage.saveGame(game);
  }, []);

  const discardSavedGame = useCallback(() => {
    setSavedGame(null);
    setSavedGameDamaged(false);
    void storage.clearSavedGame();
  }, []);

  const recordCompletion = useCallback(
    async (puzzle: Puzzle, input: CompletionInput): Promise<Completion> => {
      const game = completedGameFrom(puzzle, { ...input, finishedAt: Date.now() });
      const previous = historyRef.current;
      const improvement = improvementFor(game, previous.games);

      const next = appendGame(previous, game);
      historyRef.current = next;
      setHistory(next);
      setSavedGame(null);

      const [recorded] = await Promise.all([storage.saveHistory(next), storage.clearSavedGame()]);
      if (recorded) setHistoryDamaged(false);
      return { improvement, recorded };
    },
    [],
  );

  // A lesson walked to the end. Nothing is shown for it yet and the tutorial
  // does not read it — it is written now so that whatever is built on it later
  // has a record going back to today rather than to the day it was built.
  const recordLessonWalked = useCallback((lesson: string) => {
    const next = withWalked(walkedRef.current, lesson);
    if (next === walkedRef.current) return;
    walkedRef.current = next;
    setWalked(next);
    void storage.saveWalked(next);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = EMPTY_HISTORY;
    setHistory(EMPTY_HISTORY);
    setHistoryDamaged(false);
    void storage.clearHistory();
    // The lessons go with it. "Clear statistics" says it deletes every finished
    // game and all your times, and a record of what you have been taught is
    // part of what the app knows about you.
    walkedRef.current = EMPTY_WALKED;
    setWalked(EMPTY_WALKED);
    void storage.clearWalked();
  }, []);

  const stats = useMemo(() => summarise(history.games, SIZES), [history.games]);

  return {
    ready,
    savedGame,
    savedGameDamaged,
    history: history.games,
    historyDamaged,
    stats,
    lessonsWalked: walked.lessons,
    recordLessonWalked,
    saveProgress,
    discardSavedGame,
    recordCompletion,
    clearHistory,
  };
}
