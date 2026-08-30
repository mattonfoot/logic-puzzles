/**
 * The colours the player can draw the app in.
 *
 * A puzzle used to bring its own accent with it, which meant the app changed
 * colour every time the generator rolled a different theme — a decision nobody
 * made, taken away from the one person with an opinion about it. The colour is
 * now the player's, set once and kept, and a puzzle's theme decides only what
 * it is about.
 *
 * A colour is a small set rather than a single hue: a **primary** for links,
 * ticks and headings, a **secondary** for the quieter half of the same job, and
 * optionally the **page** they are meant to sit on. There is a set per scheme,
 * because a colour that carries white text by day is too dark to read on a
 * near-black page and the light cut that reads there cannot carry white.
 */
import { t } from '../i18n';

export interface AccentCut {
  /** Links, ticks, headings — and the ground the title panel is painted in. */
  primary: string;
  /** What the board fills in for itself, and anything the primary would shout. */
  secondary: string;
  /**
   * The page, when this colour brings its own. The shades that sit on it — the
   * board's squares, the lines, the quieter surface — are worked out from it,
   * so they belong to the same page rather than to the one before it.
   */
  bg?: string;
}

export interface Accent {
  id: string;
  name: string;
  day: AccentCut;
  night: AccentCut;
}

/**
 * Green's night cut is a leaf green rather than the mint the night palette uses
 * for `success`: two greens a shade apart, one of which means "a personal best"
 * and one of which means nothing at all, is a distinction nobody can be asked
 * to make.
 */
export const ACCENTS: Accent[] = [
  {
    id: 'blue',
    name: t('accents.blue'),
    // The one colour with a page of its own: a deep navy on a cool near-white,
    // with the mid blue doing the quiet half of the work.
    day: { primary: '#064789', secondary: '#427AA1', bg: '#EBF2FA' },
    night: { primary: '#7AA8D0', secondary: '#4E88B5' },
  },
  {
    // Its two colours serve in both schemes, swapping which leads: on a pale
    // page the deeper one leads and the lighter one is the quiet half, and on a
    // near-black one it is the other way round.
    id: 'violet',
    name: t('accents.violet'),
    day: { primary: '#7A64FF', secondary: '#8B8BE8', bg: '#F8F7FF' },
    night: { primary: '#8B8BE8', secondary: '#7A64FF' },
  },
  {
    id: 'teal',
    name: t('accents.teal'),
    day: { primary: '#0F7C7B', secondary: '#77B2AE' },
    night: { primary: '#4FC7C4', secondary: '#357E7C' },
  },
  {
    id: 'green',
    name: t('accents.green'),
    day: { primary: '#2F8F4E', secondary: '#89BC95' },
    night: { primary: '#6ACF72', secondary: '#45834B' },
  },
  {
    id: 'rust',
    name: t('accents.rust'),
    day: { primary: '#B25F2E', secondary: '#D1A284' },
    night: { primary: '#E39A63', secondary: '#8E6342' },
  },
];

export const DEFAULT_ACCENT = ACCENTS[0].id;

/** The accent an id names, falling back to the first rather than throwing. */
export function accentById(id: string): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

/** The one after it, wrapping round — which is what the settings rows do. */
export function nextAccent(id: string): Accent {
  const at = ACCENTS.findIndex((accent) => accent.id === id);
  return ACCENTS[(at + 1) % ACCENTS.length];
}
