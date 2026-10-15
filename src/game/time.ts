import { t } from '../i18n';

/** Times and dates, shared by the timer, the stats screen, the achievements and the clue list. */

/** The local calendar day a moment falls on, as a number, so "the day after" is a subtraction. */
export function localDay(at: number): number {
  const date = new Date(at);
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
}

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
  if (hours > 0) return t('stats.span.hours', { hours, minutes });
  if (minutes > 0) return t('stats.span.minutes', { minutes });
  return t('stats.span.seconds', { seconds: safe });
}
