import { dayPalette, nightPalette } from '../../ui/theme';
import { resolvePalette } from '../../ui/ThemeProvider';
import { DEFAULT_SETTINGS, reviveSettings, SETTINGS_VERSION } from '../settings';

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

describe('which colours a preference means', () => {
  it('says what it is told', () => {
    expect(resolvePalette('day', true)).toBe(dayPalette);
    expect(resolvePalette('night', false)).toBe(nightPalette);
  });

  it('follows the device when asked to', () => {
    expect(resolvePalette('auto', false)).toBe(dayPalette);
    expect(resolvePalette('auto', true)).toBe(nightPalette);
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
