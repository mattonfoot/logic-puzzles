import { useEffect, useRef, useState } from 'react';

export { formatDuration, formatGap, formatSpan } from './time';

/**
 * Counts elapsed seconds while `running`.
 *
 * `resetKey` starts the count over — a different puzzle, or the same one
 * restarted — from `startAt`, which is what a resumed game had on its clock.
 * The clock is derived from a timestamp rather than counted up, so it stays
 * honest across re-renders and pauses.
 */
export function useTimer(running: boolean, resetKey: unknown, startAt = 0): number {
  const [seconds, setSeconds] = useState(startAt);
  /** When the clock reads zero, in wall-clock time. */
  const base = useRef(Date.now() - startAt * 1000);
  /** The value on screen, readable from effects that run before the next render. */
  const shown = useRef(startAt);
  shown.current = seconds;

  useEffect(() => {
    base.current = Date.now() - startAt * 1000;
    shown.current = startAt;
    setSeconds(startAt);
    // `startAt` belongs to the game `resetKey` identifies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    // Picking up after a pause: don't count the time that passed while stopped.
    base.current = Date.now() - shown.current * 1000;
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - base.current) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [running, resetKey]);

  return seconds;
}
