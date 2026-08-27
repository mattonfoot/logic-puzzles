import { ACCENTS, accentById, DEFAULT_ACCENT, nextAccent } from '../../ui/accents';
import { dayPalette, nightPalette } from '../../ui/theme';
import { resolvePalette } from '../../ui/ThemeProvider';
import {
  DEFAULT_SETTINGS,
  reviveSettings,
  SETTINGS_VERSION,
  VOLUMES,
  volumeStep,
} from '../settings';

describe('reading settings back', () => {
  it('round-trips what was written', () => {
    const settings = { ...DEFAULT_SETTINGS, autoFacts: false, colours: 'night' as const };
    expect(reviveSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it('fills in a field that was not there when they were written', () => {
    const partial = { version: SETTINGS_VERSION, autoEliminate: false };
    expect(reviveSettings(partial)).toEqual({
      ...DEFAULT_SETTINGS,
      autoEliminate: false,
    });
  });

  it('refuses a colour it does not have', () => {
    const odd = { ...DEFAULT_SETTINGS, colours: 'dusk' };
    expect(reviveSettings(odd)?.colours).toBe(DEFAULT_SETTINGS.colours);
  });

  it('refuses junk and another version', () => {
    expect(reviveSettings(null)).toBeNull();
    expect(reviveSettings('night')).toBeNull();
    expect(reviveSettings({ ...DEFAULT_SETTINGS, version: SETTINGS_VERSION + 1 })).toBeNull();
  });
});

describe('volume', () => {
  it('clamps a value from outside the range rather than throwing it away', () => {
    expect(reviveSettings({ ...DEFAULT_SETTINGS, volume: 4 })?.volume).toBe(1);
    expect(reviveSettings({ ...DEFAULT_SETTINGS, volume: -2 })?.volume).toBe(0);
  });

  it('falls back when it is not a number at all', () => {
    expect(reviveSettings({ ...DEFAULT_SETTINGS, volume: 'loud' })?.volume).toBe(
      DEFAULT_SETTINGS.volume,
    );
    expect(reviveSettings({ ...DEFAULT_SETTINGS, volume: Number.NaN })?.volume).toBe(
      DEFAULT_SETTINGS.volume,
    );
  });

  it('shows the nearest step for whatever is stored', () => {
    expect(volumeStep(0).label).toBe('Off');
    expect(volumeStep(1).label).toBe('Loud');
    expect(volumeStep(0.55).label).toBe('Medium');
    // A value from some older build still lands on a step rather than nothing.
    expect(VOLUMES).toContain(volumeStep(0.42));
  });
});

describe('which colours a preference means', () => {
  it('says what it is told', () => {
    expect(resolvePalette('day', true)).toEqual(dayPalette);
    expect(resolvePalette('night', false)).toEqual(nightPalette);
  });

  it('follows the device when asked to', () => {
    expect(resolvePalette('auto', false)).toEqual(dayPalette);
    expect(resolvePalette('auto', true)).toEqual(nightPalette);
  });

  it('takes the accent from the player and everything else from the scheme', () => {
    for (const accent of ACCENTS) {
      const day = resolvePalette('day', false, accent.id);
      const night = resolvePalette('night', false, accent.id);
      expect(day.accent).toBe(accent.day);
      expect(night.accent).toBe(accent.night);
      // The panel's ground is the daytime cut whichever scheme is in force, so
      // the white on it stays readable after dark.
      expect(day.accentGround).toBe(accent.day);
      expect(night.accentGround).toBe(accent.day);
      // The page itself does not move with the accent.
      const bare = { accent: '', accentGround: '' };
      expect({ ...day, ...bare }).toEqual({ ...dayPalette, ...bare });
      expect({ ...night, ...bare }).toEqual({ ...nightPalette, ...bare });
    }
  });

  it('falls back rather than drawing in nothing', () => {
    expect(resolvePalette('day', false, 'a colour nobody chose').accent).toBe(
      accentById(DEFAULT_ACCENT).day,
    );
  });
});

describe('the colours the player can choose', () => {
  it('offers several, each named once', () => {
    expect(ACCENTS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ACCENTS.map((accent) => accent.id)).size).toBe(ACCENTS.length);
    expect(new Set(ACCENTS.map((accent) => accent.name)).size).toBe(ACCENTS.length);
  });

  it('has a light cut and a dark one for each, so both schemes can read it', () => {
    // A cheap stand-in for lightness: the sum of the channels.
    const weight = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    for (const accent of ACCENTS) {
      expect(`${accent.id}: ${accent.day} then ${accent.night}`).toMatch(/^#?/);
      expect(weight(accent.night)).toBeGreaterThan(weight(accent.day));
    }
  });

  it('comes back round to where it started', () => {
    let id = DEFAULT_ACCENT;
    const seen = new Set<string>();
    for (let step = 0; step < ACCENTS.length; step++) {
      seen.add(id);
      id = nextAccent(id).id;
    }
    expect(seen.size).toBe(ACCENTS.length);
    expect(id).toBe(DEFAULT_ACCENT);
  });
});

describe('the two palettes', () => {
  it('name every colour the other one does', () => {
    expect(Object.keys(nightPalette).sort()).toEqual(Object.keys(dayPalette).sort());
  });

  it('run opposite ways round', () => {
    // A cheap stand-in for lightness: the sum of the channels.
    const weight = (hex: string) =>
      [1, 3, 5].reduce((total, at) => total + parseInt(hex.slice(at, at + 2), 16), 0);

    expect(weight(dayPalette.bg)).toBeGreaterThan(weight(dayPalette.ink));
    expect(weight(nightPalette.bg)).toBeLessThan(weight(nightPalette.ink));
    // The board's two squares are told apart in both.
    expect(dayPalette.boardLight).not.toBe(dayPalette.boardShade);
    expect(nightPalette.boardLight).not.toBe(nightPalette.boardShade);
  });
});
