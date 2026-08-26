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
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  autoEliminate: true,
  autoFacts: true,
  colours: 'auto',
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
  };
}
