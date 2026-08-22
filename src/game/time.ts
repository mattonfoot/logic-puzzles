/** Duration formatting shared by the timer, the stats screen and the clue list. */

/** 92 → "1:32", 3671 → "1:01:11". */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  const paddedSeconds = rest.toString().padStart(2, '0');
  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`;
}

/** Longer spans, for totals: 5400 → "1h 30m". */
export function formatSpan(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${safe}s`;
}

/** Signed gap between two times: -18 → "18s faster". */
export function formatGap(deltaSeconds: number): string {
  const size = formatDuration(Math.abs(deltaSeconds));
  return deltaSeconds < 0 ? `${size} faster` : `${size} slower`;
}
