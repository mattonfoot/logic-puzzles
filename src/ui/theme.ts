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
   * A quieter partner to the accent: what the board fills in for itself, and
   * anything the accent at full strength would shout. A colour that brings its
   * own set names it; one that does not gets the accent mixed back towards the
   * page.
   */
  accentSoft: string;
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
  accentSoft: '#99AAF6',
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
  accentSoft: '#596AA0',
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

/**
 * The sizes the app sets its own words at, and the only place they are decided.
 *
 * Every screen but the board is a title over a short list of choices, and those
 * two things had drifted into five sizes between them: the front door's words at
 * 56 over 64, the difficulties at 33 over 40, the same difficulties on the daily
 * screen at 33 over *44*, the numbered puzzles at 26 over 34, and a title with
 * no line height at all. Stepping from one to the next changed the type as well
 * as the words, which makes four screens that share a panel look like four
 * different apps under it.
 *
 * One scale now, named here and read from there. `menu` is what a choice is set
 * at wherever one is offered — a door, a difficulty, a numbered puzzle — and it
 * is the size it is because the numbered list is the longest of them: five rows,
 * a pager and the way back have to stand in the half of an iPhone 11 Pro the
 * panel leaves, and that is what 33 over 40 buys.
 */
export const type = {
  /**
   * The front door's ways in: Daily, Play, How to play.
   *
   * Larger than the choices further in, and it can afford to be — there are
   * three of them and the longest is eleven letters, where a list of lessons or
   * of difficulties has more rows of longer names. This is the first thing
   * anybody sees and the largest decision on it, and it reads that way. It
   * stops short of the panel's own 62 so the doors under the name are plainly
   * the second-largest thing on the page rather than a rival to it.
   */
  door: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    letterSpacing: -1,
  },
  /** A choice in a list: a difficulty, a numbered puzzle, a daily challenge. */
  menu: {
    fontSize: 33,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  /**
   * The same, for a list whose choices are named in phrases rather than words.
   *
   * "Compare the gap clues" measures 328 points at the size above, against the
   * 311 an iPhone 11 Pro leaves between the margins, so it wrapped — and a menu
   * where one row is two lines high is a menu with a mistake in it. At this
   * size the longest of them comes to 276 and the shortest list still reads as
   * the same kind of question the others ask.
   */
  menuLong: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  /** What a screen is called, over its rule. */
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  /** The quiet line beside or under one of those: a time, a hint, a count. */
  note: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
} as const;

/** What one menu row takes, including the air above and below it. */
export const MENU_ROW = type.menu.lineHeight + space(1) * 2;

/**
 * The air under a screen's title, and above the first thing it names. Held here
 * rather than per screen, so no two screens can drift apart on it.
 */
export const TITLE_GAP = space(4);

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

/** How much light a colour throws back, on the WCAG scale. */
export function luminance(hex: string): number {
  const channel = (at: number) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** How far apart two colours are to read, 1 (identical) to 21 (black on white). */
export function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Whichever of two inks reads better on a given ground.
 *
 * The accent is the player's, and a colour light enough to be pleasant on a
 * pale page is not always dark enough to carry white. Rather than ruling such a
 * colour out, anything painted in the accent asks which ink to use — so a deep
 * navy takes white and a pale lilac takes the page's own ink, and both stay
 * readable.
 */
export function inkOn(ground: string, light: string, dark: string): string {
  return contrast(ground, light) >= contrast(ground, dark) ? light : dark;
}

/** Two colours blended: `amount` of `towards` mixed into `hex`. */
export function mix(hex: string, towards: string, amount: number): string {
  const channels = (value: string) => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16));
  const [r1, g1, b1] = channels(hex);
  const [r2, g2, b2] = channels(towards);
  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[blend(r1, r2), blend(g1, g2), blend(b1, b2)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

/**
 * The shades that sit directly on a page, worked out from the page itself.
 *
 * A colour that brings its own background brings these with it: leaving the
 * board's warm cream squares and lines on a cool blue page reads as a mistake
 * rather than as a choice. A colour that does not keeps the palette's own,
 * which are hand-picked rather than mixed and stay exactly as they are.
 *
 * A card is the page rather than a white sheet laid on it. On a tinted page a
 * white card is the brightest thing on the screen, which is a lot of emphasis
 * for something that only means "these belong together" — its border and its
 * shadow already say that. The quieter surface goes the other way instead,
 * a shade *into* the page rather than out of it.
 *
 * The chart goes with them. Its gridline and its average line are page shades
 * doing a chart's job, and its bars take the colour the app is drawn in: a
 * chart in a different blue from everything around it, on a blue page, reads as
 * an accident rather than as a second meaning.
 */
export function pageShades(bg: string, ink: string, series: string) {
  return {
    bg,
    surface: bg,
    surfaceAlt: mix(bg, ink, 0.045),
    boardLight: mix(bg, ink, 0.035),
    boardShade: mix(bg, ink, 0.095),
    line: mix(bg, ink, 0.1),
    lineStrong: mix(bg, ink, 0.2),
    chart: {
      series,
      // Just short of `line`: a gridline is a hint of one.
      grid: mix(bg, ink, 0.08),
      // Deeper than any of them, because the average is a line worth reading.
      reference: mix(bg, ink, 0.35),
    },
  };
}

/**
 * Every colour in a palette, flattened to a list of role and value.
 *
 * What the palette tests hold the two schemes to: every role a real hex, and
 * one scheme naming every colour the other does. It reads the palette rather
 * than naming the roles itself, so a colour added to `Palette` is covered
 * without anyone remembering to list it. `scheme` is not a colour and drops
 * out; `chart` is a group and is spread into one entry per member.
 */
export function paletteSwatches(palette: Palette): { role: string; value: string }[] {
  const swatches: { role: string; value: string }[] = [];
  for (const [role, value] of Object.entries(palette)) {
    if (typeof value === 'string' && role !== 'scheme') {
      swatches.push({ role, value });
    } else if (value && typeof value === 'object') {
      for (const [inner, hex] of Object.entries(value as Record<string, string>)) {
        swatches.push({ role: `${role}.${inner}`, value: hex });
      }
    }
  }
  return swatches;
}

/** Flattens an accent colour to a soft background tint. */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
