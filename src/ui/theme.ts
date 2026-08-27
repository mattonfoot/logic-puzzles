import { Platform } from 'react-native';

/**
 * Every colour the app draws with. Two of these exist — day and night — and
 * `useTheme` hands the components whichever is in force, so a screen never
 * names a colour, only a role.
 */
export interface Palette {
  /** The colour the player chose, in the cut this scheme can read. */
  accent: string;
  /**
   * The same colour as a ground for white text — always the darker, daytime
   * cut, because the title panel is painted in it in both schemes and the night
   * cut is too light to carry white.
   */
  accentGround: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  /**
   * The two squares of the board's checkerboard. Both sit a little deeper than
   * the page — a grid printed on the paper rather than laid on top of it — and
   * far enough apart to be told from one another at a glance.
   */
  boardLight: string;
  boardShade: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineStrong: string;
  danger: string;
  success: string;
  /**
   * Chart ink: one series hue (checked against the card behind it for
   * lightness, chroma and 3:1 contrast) plus recessive gridline and baseline.
   */
  chart: { series: string; grid: string; reference: string };
  /** Which way round this palette runs, for the status bar and the like. */
  scheme: 'day' | 'night';
}

export const dayPalette: Palette = {
  accent: '#4C6FFF',
  accentGround: '#4C6FFF',
  bg: '#F6F3EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF9F3',
  boardLight: '#F1EEE4',
  boardShade: '#E7E1D4',
  ink: '#1D2333',
  inkSoft: '#5C6379',
  inkFaint: '#98A0B3',
  line: '#E7E1D4',
  lineStrong: '#D2CAB6',
  danger: '#D6455D',
  success: '#2E9E6B',
  chart: { series: '#2a78d6', grid: '#EBE6DA', reference: '#B7AF9C' },
  scheme: 'day',
};

/**
 * The same page at night. It is not the day palette inverted: the ground is a
 * warm near-black rather than a pure one, the ink is a soft off-white so it
 * does not glare, and the board's two squares sit a little *lighter* than the
 * page — the same "printed on the paper" relationship read the other way up,
 * because on a dark ground it is the ink that has to lift off the page.
 */
export const nightPalette: Palette = {
  accent: '#8AA2FF',
  accentGround: '#4C6FFF',
  bg: '#14161C',
  surface: '#1B1E26',
  surfaceAlt: '#20242D',
  boardLight: '#232733',
  boardShade: '#2C313F',
  ink: '#ECEDF2',
  inkSoft: '#A9B0C2',
  inkFaint: '#6C748A',
  line: '#2C313F',
  lineStrong: '#3C4354',
  danger: '#FF7A8E',
  success: '#5FCF9B',
  chart: { series: '#6E9BE8', grid: '#2C313F', reference: '#4A5265' },
  scheme: 'night',
};

/**
 * Square corners throughout — the app is drawn like a printed puzzle page.
 * The scale is kept so the decision lives in one place rather than in every
 * component that used to round something.
 */
export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  pill: 0,
};

/** Every visible border is one line thick. */
export const border = 1;

/**
 * Bordered neighbours sit flush and share that one line, instead of each
 * drawing its own edge with a gap between. Apply to every child of a joined
 * row or column after the first.
 */
export const joinLeft = { marginLeft: -border };
export const joinTop = { marginTop: -border };

export const space = (steps: number) => steps * 4;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#2A2317',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 3 },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#2A2317',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 6 },
  }),
} as const;

/** Flattens an accent colour to a soft background tint. */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
