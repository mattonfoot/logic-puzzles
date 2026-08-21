import { useEffect, useRef, useState } from 'react';

/** Counts elapsed seconds while `running`; `resetKey` starts a fresh count. */
export function useTimer(running: boolean, resetKey: unknown): number {
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setSeconds(0);
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

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
