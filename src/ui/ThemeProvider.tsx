import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { accentById, DEFAULT_ACCENT } from './accents';
import { dayPalette, nightPalette, pageShades, type Palette } from './theme';

/** What the player asked for, which is not always a colour scheme. */
export type ColourPreference = 'day' | 'night' | 'auto';

const ThemeContext = createContext<Palette>(dayPalette);

/**
 * The palette a preference resolves to, given what the device is doing and
 * which colour the player has chosen.
 *
 * The scheme decides the page and the ink; the colour decides the accent, its
 * quieter partner, and — when it brings one — the page itself, along with the
 * shades that sit on it. A colour with no page of its own leaves the scheme's
 * alone, so picking Teal is a change of accent and nothing else.
 */
export function resolvePalette(
  preference: ColourPreference,
  systemIsDark: boolean,
  accent: string = DEFAULT_ACCENT,
): Palette {
  const night = preference === 'auto' ? systemIsDark : preference === 'night';
  const base = night ? nightPalette : dayPalette;
  const chosen = accentById(accent);
  const cut = night ? chosen.night : chosen.day;
  return {
    ...base,
    ...(cut.bg ? pageShades(cut.bg, base.ink, cut.primary) : null),
    accent: cut.primary,
    accentSoft: cut.secondary,
    accentGround: chosen.day.primary,
  };
}

export function ThemeProvider({
  preference,
  accent,
  children,
}: {
  preference: ColourPreference;
  accent: string;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const palette = useMemo(
    () => resolvePalette(preference, system === 'dark', accent),
    [preference, system, accent],
  );
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

/** The colours in force. */
export function useTheme(): Palette {
  return useContext(ThemeContext);
}

/**
 * A screen's stylesheet, rebuilt when the palette changes.
 *
 * `StyleSheet.create` bakes its colours in at the moment it runs, so a
 * stylesheet written at module scope can never change scheme. Writing it as a
 * function of the palette instead — `const makeStyles = (palette) =>
 * StyleSheet.create({...})` — and calling it through this hook gives the same
 * stylesheet, built once per palette rather than once per app.
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(make: (palette: Palette) => T): T {
  const palette = useTheme();
  return useMemo(() => make(palette), [make, palette]);
}
