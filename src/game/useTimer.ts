import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export { formatDuration, formatGap, formatSpan } from './time';

export interface Timer {
  /**
   * The count as of the last time the clock stopped. It does not tick while
   * the clock runs — a value that changed every second would redraw whatever
   * holds it every second — so it is for showing once the clock is stopped.
   */
  seconds: number;
  /** The count right now, running or not. Stable across renders. */
  elapsed: () => number;
}

/**
 * Counts elapsed seconds while `running`.
 *
 * `resetKey` starts the count over — a different puzzle, or the same one
 * restarted — from `startAt`, which is what a resumed game had on its clock.
 * The clock is derived from a timestamp rather than counted up, so it stays
 * honest across re-renders and pauses.
 */
export function useTimer(running: boolean, resetKey: unknown, startAt = 0): Timer {
  const [seconds, setSeconds] = useState(startAt);
  /** When the clock reads zero, in wall-clock time; meaningful while running. */
  const base = useRef(Date.now() - startAt * 1000);
  /** Whether the clock is running right now. */
  const live = useRef(false);
  /** The count while stopped. */
  const held = useRef(startAt);

  const elapsed = useCallback(
    () => (live.current ? Math.floor((Date.now() - base.current) / 1000) : held.current),
    [],
  );

  // Both effects are layout effects so that, on a new game, the count is set
  // back before the clock starts again from it, and so the stopped count is
  // on screen in the same frame the clock stops rather than one frame after.
  useLayoutEffect(() => {
    held.current = startAt;
    setSeconds(startAt);
    // `startAt` belongs to the game `resetKey` identifies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useLayoutEffect(() => {
    if (!running) return;
    // Picking up after a pause: don't count the time that passed while stopped.
    base.current = Date.now() - held.current * 1000;
    live.current = true;
    return () => {
      held.current = elapsed();
      live.current = false;
      setSeconds(held.current);
    };
  }, [running, resetKey, elapsed]);

  return { seconds, elapsed };
}
