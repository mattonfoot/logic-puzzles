/**
 * The colours the player can draw the app in.
 *
 * A puzzle used to bring its own accent with it, which meant the app changed
 * colour every time the generator rolled a different theme — a decision nobody
 * made, taken away from the one person with an opinion about it. The colour is
 * now the player's, set once and kept, and a puzzle's theme decides only what
 * it is about.
 *
 * Each has two cuts. The `day` one is dark enough to carry white text, because
 * it is the ground the title panel is painted in on every screen before a
 * puzzle starts; the `night` one is light enough to read on a near-black page.
 * The panel keeps the day cut in both schemes for that reason.
 */
export interface Accent {
  id: string;
  name: string;
  day: string;
  night: string;
}

export const ACCENTS: Accent[] = [
  { id: 'blue', name: 'Blue', day: '#4C6FFF', night: '#8AA2FF' },
  { id: 'violet', name: 'Violet', day: '#6A45E0', night: '#A996FF' },
  { id: 'teal', name: 'Teal', day: '#0F7C7B', night: '#4FC7C4' },
  { id: 'green', name: 'Green', day: '#2F8F4E', night: '#5FCF9B' },
  { id: 'rust', name: 'Rust', day: '#B25F2E', night: '#E39A63' },
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
