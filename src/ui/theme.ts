import { Platform } from 'react-native';

export const palette = {
  /** Used by the setup and statistics screens, which have no theme of their own. */
  accent: '#4C6FFF',
  bg: '#F1EDE2',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF9F3',
  /**
   * The two squares of the board's checkerboard. Both sit lighter than the
   * page, so the grid reads as paper laid on the page, and far enough apart to
   * be told from one another at a glance.
   */
  boardLight: '#FFFFFF',
  boardShade: '#F9F7F0',
  ink: '#1D2333',
  inkSoft: '#5C6379',
  inkFaint: '#98A0B3',
  line: '#E7E1D4',
  lineStrong: '#D2CAB6',
  danger: '#D6455D',
  success: '#2E9E6B',
};

/**
 * Chart ink. One series hue (validated against the light card surface for
 * lightness, chroma and 3:1 contrast) plus recessive gridline and baseline.
 */
export const chart = {
  series: '#2a78d6',
  grid: '#EBE6DA',
  reference: '#B7AF9C',
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

export const fontFamily = Platform.select({
  ios: 'System',
  default: undefined,
});

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
