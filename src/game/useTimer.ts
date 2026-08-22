import { useEffect, useState } from 'react';

export { formatDuration, formatGap, formatSpan } from './time';

/**
 * Counts elapsed seconds while `running`.
 * `resetKey` restarts the count; `startAt` seeds it from a resumed game.
 */
export function useTimer(running: boolean, resetKey: unknown, startAt = 0): number {
  const [seconds, setSeconds] = useState(startAt);

  useEffect(() => {
    setSeconds(startAt);
    // `startAt` only matters when a different game is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    const base = Date.now() - seconds * 1000;
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - base) / 1000));
    }, 250);
    return () => clearInterval(timer);
    // `seconds` is read once to rebase the clock; listing it here would tear the
    // interval down and rebuild it on every tick.
  }, [running, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return seconds;
}
