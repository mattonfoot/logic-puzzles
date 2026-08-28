import { ACCENTS, accentById, DEFAULT_ACCENT, nextAccent } from '../../ui/accents';
import { contrast, dayPalette, inkOn, nightPalette, paletteSwatches } from '../../ui/theme';
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
  // Which scheme a palette came from, read off the parts a colour never moves.
  // Not the surfaces: a colour that brings its own page brings those with it.
  const schemeOf = (palette: typeof dayPalette) => ({
    scheme: palette.scheme,
    ink: palette.ink,
    inkFaint: palette.inkFaint,
    danger: palette.danger,
  });
  const day = schemeOf(dayPalette);
  const night = schemeOf(nightPalette);

  it('says what it is told', () => {
    expect(schemeOf(resolvePalette('day', true))).toEqual(day);
    expect(schemeOf(resolvePalette('night', false))).toEqual(night);
  });

  it('follows the device when asked to', () => {
    expect(schemeOf(resolvePalette('auto', false))).toEqual(day);
    expect(schemeOf(resolvePalette('auto', true))).toEqual(night);
  });

  it('leaves the scheme alone for a colour with no page of its own', () => {
    const plain = ACCENTS.find((accent) => !accent.day.bg);
    if (!plain) throw new Error('expected a colour with no page of its own');
    const bare = { accent: '', accentSoft: '', accentGround: '' };
    expect({ ...resolvePalette('day', false, plain.id), ...bare }).toEqual({
      ...dayPalette,
      ...bare,
    });
  });

  it('takes the accent from the player and everything else from the scheme', () => {
    for (const accent of ACCENTS) {
      const day = resolvePalette('day', false, accent.id);
      const night = resolvePalette('night', false, accent.id);
      expect(day.accent).toBe(accent.day.primary);
      expect(night.accent).toBe(accent.night.primary);
      expect(day.accentSoft).toBe(accent.day.secondary);
      expect(night.accentSoft).toBe(accent.night.secondary);
      // The panel's ground is the daytime primary whichever scheme is in force,
      // so the white on it stays readable after dark.
      expect(day.accentGround).toBe(accent.day.primary);
      expect(night.accentGround).toBe(accent.day.primary);

      // The ink never moves with the colour, whatever else does.
      expect(day.ink).toBe(dayPalette.ink);
      expect(night.ink).toBe(nightPalette.ink);

      // A colour with no page of its own leaves the scheme's alone.
      if (!accent.day.bg) expect(day.bg).toBe(dayPalette.bg);
      if (!accent.night.bg) expect(night.bg).toBe(nightPalette.bg);
    }
  });

  it('falls back rather than drawing in nothing', () => {
    expect(resolvePalette('day', false, 'a colour nobody chose').accent).toBe(
      accentById(DEFAULT_ACCENT).day.primary,
    );
  });

  it('brings the shades that sit on a page along with the page', () => {
    const withPage = ACCENTS.find((accent) => accent.day.bg);
    if (!withPage) throw new Error('expected a colour that brings its own page');

    const palette = resolvePalette('day', false, withPage.id);
    expect(palette.bg).toBe(withPage.day.bg);
    // Nothing sitting on that page is left over from the one before it.
    // A card is the page here, not a white sheet laid on it.
    expect(palette.surface).toBe(withPage.day.bg);
    for (const role of ['surfaceAlt', 'boardLight', 'boardShade', 'line', 'lineStrong'] as const) {
      expect(`${role}: ${palette[role]}`).not.toBe(`${role}: ${dayPalette[role]}`);
    }
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
      expect(weight(accent.night.primary)).toBeGreaterThan(weight(accent.day.primary));
      // The secondary is a quieter partner, not a second primary.
      expect(accent.day.secondary).not.toBe(accent.day.primary);
      expect(accent.night.secondary).not.toBe(accent.night.primary);
    }
  });

  it('keeps out of the way of the colours that mean something', () => {
    // A colour that all but matches "solved a personal best" is a colour that
    // makes the message ambiguous.
    for (const accent of ACCENTS) {
      expect(accent.day.primary).not.toBe(dayPalette.success);
      expect(accent.day.primary).not.toBe(dayPalette.danger);
      expect(accent.night.primary).not.toBe(nightPalette.success);
      expect(accent.night.primary).not.toBe(nightPalette.danger);
    }
  });

  it('has an ink that can be read on every primary', () => {
    // Whatever the player picks, the panel it is painted on and the buttons
    // filled with it have to carry their words. Large text needs 3:1.
    for (const accent of ACCENTS) {
      const ground = accent.day.primary;
      const on = inkOn(ground, '#FFFFFF', dayPalette.ink);
      expect(`${accent.id}: ${contrast(ground, on) >= 3 ? 'readable' : 'too close'}`).toBe(
        `${accent.id}: readable`,
      );
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

describe('listing a palette', () => {
  it('names every colour in it, and nothing that is not one', () => {
    const swatches = paletteSwatches(dayPalette);
    const roles = swatches.map((swatch) => swatch.role);

    // Every plain colour on the palette, and every member of every group.
    for (const [role, value] of Object.entries(dayPalette)) {
      if (role === 'scheme') continue;
      if (typeof value === 'string') {
        expect(roles).toContain(role);
      } else {
        for (const inner of Object.keys(value)) expect(roles).toContain(`${role}.${inner}`);
      }
    }
    expect(roles).not.toContain('scheme');
    expect(new Set(roles).size).toBe(roles.length);
    for (const swatch of swatches) {
      expect(`${swatch.role}: ${swatch.value}`).toMatch(/: #[0-9a-fA-F]{6}$/);
    }
  });

  it('tells the two schemes apart', () => {
    expect(paletteSwatches(dayPalette)).not.toEqual(paletteSwatches(nightPalette));
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
