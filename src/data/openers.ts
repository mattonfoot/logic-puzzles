/**
 * The line above a clue: who is supposed to have said it.
 *
 * A clue is a bare fact — "the diver with green eyes stands taller than the
 * Foxglove grower" — and a bare fact is nobody's. Putting somebody in front of
 * it makes the puzzle a thing people are talking about rather than a table with
 * the numbers filed off, and costs nothing: the opener says who, never what, so
 * it cannot help or mislead.
 *
 * The lines are in `locales/en-HB.yaml`; this decides which one a clue gets.
 * `{noun}` is the theme's own word for one member of its anchor set — diver,
 * gardener, astronaut — which every theme already carries for its clue wording.
 * The ones that use it sound like the puzzle; the ones that do not sound like a
 * bystander, and both belong.
 */
import { fill, STRINGS } from '../i18n';
import { createRng } from '../puzzle/rng';
import type { Puzzle } from '../puzzle/types';

export const OPENERS: readonly string[] = STRINGS.clue.openers;

/**
 * The opener for one clue, which is the same one every time it is read.
 *
 * Drawn from the puzzle's seed and the clue's own index rather than rolled when
 * the window opens: paging back to a clue should bring back the clue you read,
 * and a game picked up tomorrow should be the game you left. Nothing about it
 * is stored — like everything else here, the seed is enough to say it again.
 */
export function clueOpener(puzzle: Puzzle, index: number): string {
  // Spread apart so neighbouring clues do not draw neighbouring openers; the
  // multiplier is a prime, which is all it has to be.
  const rng = createRng(puzzle.seed + (index + 1) * 7919);
  return fill(rng.pick(OPENERS), { noun: puzzle.categories[0].noun });
}
