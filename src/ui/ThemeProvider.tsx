import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { dayPalette, nightPalette, type Palette } from './theme';

/** What the player asked for, which is not always a colour scheme. */
export type ColourPreference = 'day' | 'night' | 'auto';

const ThemeContext = createContext<Palette>(dayPalette);

/** The palette a preference resolves to, given what the device is doing. */
export function resolvePalette(preference: ColourPreference, systemIsDark: boolean): Palette {
  if (preference === 'auto') return systemIsDark ? nightPalette : dayPalette;
  return preference === 'night' ? nightPalette : dayPalette;
}

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ColourPreference;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const palette = useMemo(
    () => resolvePalette(preference, system === 'dark'),
    [preference, system],
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
