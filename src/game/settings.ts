/**
 * The settings that belong to the player rather than to a puzzle: what the
 * board works out for itself, and which colours the app draws in. They outlive
 * any one game, so they are written to disk and read back the same guarded way
 * as everything else.
 */
import type { ColourPreference } from '../ui/ThemeProvider';

export const SETTINGS_VERSION = 1;

export interface Settings {
  version: number;
  /** Whether a tick crosses out the rest of its row and column. */
  autoEliminate: boolean;
  /** Whether ticks that follow from other ticks are filled in. */
  autoFacts: boolean;
  /** Day, night, or whatever the device is doing. */
  colours: ColourPreference;
  /** Whether the phone buzzes along with what it plays. */
  haptics: boolean;
  /** How loud the effects are, 0 (silent) to 1. */
  volume: number;
}

/**
 * The volumes the settings screen offers, as the four stops on its slider.
 * Finer than that is not worth the aim it would take, and four named steps are
 * something a screen reader can say.
 */
export const VOLUMES = [
  { label: 'Off', value: 0 },
  { label: 'Quiet', value: 0.3 },
  { label: 'Medium', value: 0.6 },
  { label: 'Loud', value: 1 },
] as const;

/** The step a stored volume belongs to, so an old or odd value still shows. */
export function volumeStep(volume: number): (typeof VOLUMES)[number] {
  return VOLUMES.reduce((closest, step) =>
    Math.abs(step.value - volume) < Math.abs(closest.value - volume) ? step : closest,
  );
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  autoEliminate: true,
  autoFacts: true,
  colours: 'auto',
  haptics: true,
  volume: 0.6,
};

const PREFERENCES: ColourPreference[] = ['day', 'night', 'auto'];

/**
 * Reads settings back, filling in anything a newer version has added rather
 * than throwing the lot away — losing a preference is a poor trade for a field
 * that simply was not there when they were written.
 */
export function reviveSettings(value: unknown): Settings | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Partial<Settings>;
  if (raw.version !== SETTINGS_VERSION) return null;

  return {
    version: SETTINGS_VERSION,
    autoEliminate:
      typeof raw.autoEliminate === 'boolean' ? raw.autoEliminate : DEFAULT_SETTINGS.autoEliminate,
    autoFacts: typeof raw.autoFacts === 'boolean' ? raw.autoFacts : DEFAULT_SETTINGS.autoFacts,
    colours:
      typeof raw.colours === 'string' && PREFERENCES.includes(raw.colours as ColourPreference)
        ? (raw.colours as ColourPreference)
        : DEFAULT_SETTINGS.colours,
    haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULT_SETTINGS.haptics,
    // Clamped rather than refused: a volume outside the range is a value that
    // means something, just not exactly what it says.
    volume:
      typeof raw.volume === 'number' && Number.isFinite(raw.volume)
        ? Math.min(1, Math.max(0, raw.volume))
        : DEFAULT_SETTINGS.volume,
  };
}
