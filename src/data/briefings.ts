/**
 * Why anybody is asking.
 *
 * A logic grid is a table of facts about people who do not exist, and on its own
 * that is what it feels like. A briefing puts a room around it: something went
 * wrong, nobody wrote it down, and the only way back to the truth is the handful
 * of things people half-remember — which is exactly what the clues are.
 *
 * The words are in `locales/en-HB.yaml`; this decides which of them a puzzle
 * gets. Three per theme, drawn by the seed like everything else, so a puzzle
 * keeps its story and two players comparing puzzle 7 are talking about the same
 * disaster.
 *
 * They name nobody and no set. Which sets a puzzle plays with is sampled from
 * the theme, so a briefing that promised a cargo manifest would sometimes be
 * describing a puzzle with no cargo in it; `{noun}` — the theme's own word for
 * one of its cast, the same slot the clue openers use — is the only thing filled
 * in. That also means a briefing gives nothing away: it says what happened, and
 * never what the answer is.
 */
import { fill, STRINGS } from '../i18n';
import { createRng } from '../puzzle/rng';
import type { Puzzle } from '../puzzle/types';

export interface Briefing {
  /** What the mess is called. */
  title: string;
  /** Two or three sentences: the scene, the mishap, and why it matters. */
  body: string;
}

const BY_THEME: Record<string, readonly Briefing[]> = STRINGS.briefings.themes;

/** Every scene written for a theme, in the order the language file lists them. */
export function briefingsFor(themeId: string): readonly Briefing[] {
  const written = BY_THEME[themeId];
  return Array.isArray(written) ? written : [];
}

/**
 * The briefing for a puzzle, which is the same one every time it is opened.
 *
 * Drawn from the seed, so it belongs to the puzzle rather than to the moment it
 * was asked for: closing the window and opening it again brings back the same
 * story, and a game picked up tomorrow is the game you left.
 */
export function briefingFor(puzzle: Puzzle): Briefing {
  const written = briefingsFor(puzzle.themeId);
  const noun = puzzle.categories[0].noun;
  if (written.length === 0) {
    const fallback = STRINGS.briefings.fallback;
    return { title: fallback.title, body: fill(fallback.body, { noun }) };
  }
  // A different draw from the seed than the clue openers take, so a puzzle's
  // story and its first opener are not chosen in lockstep.
  const chosen = createRng(puzzle.seed + 104729).pick(written);
  return { title: chosen.title, body: fill(chosen.body, { noun }) };
}
