/**
 * The two ways a numbered game can be played.
 *
 * The board settings — automatic crosses, worked-out ticks, and marks checked
 * against the clues read — are the player's to set, and every one of them does
 * bookkeeping a person would otherwise do with a pencil. Left on, they make the
 * game about the deduction and nothing else. Turned off, the game is the one
 * printed in the back of a newspaper, where ruling out the rest of a row is part
 * of the work and forgetting to is part of the risk.
 *
 * Both are worth having and neither is a setting, because a setting is something
 * you forget you changed. It is a choice made on the way in, it holds for the
 * whole game, and it is in the seed — so a puzzle is the puzzle *and* the way it
 * was played, and the same number is a different game on each side.
 */
import { t } from '../i18n';

export type ModeId = 'pure' | 'classic';

export interface Mode {
  id: ModeId;
  name: string;
  /** Read out under the name, and what the choice actually means. */
  hint: string;
  /**
   * The same choice in one word, for a line with no room for the full name: a
   * shared result, where "Deduction · Pure Deduction" would say the app's own
   * name twice, and a statistics row that has a difficulty to fit as well.
   */
  short: string;
  /**
   * Whether the board is allowed to work anything out. Classic switches off all
   * three board settings for the game and will not let them be turned back on;
   * the player's own settings are untouched and come back in Pure Deduction.
   */
  assists: boolean;
}

export const MODES: Mode[] = [
  {
    id: 'pure',
    name: t('modes.pure.name'),
    hint: t('modes.pure.hint'),
    short: t('modes.pure.short'),
    assists: true,
  },
  {
    id: 'classic',
    name: t('modes.classic.name'),
    hint: t('modes.classic.hint'),
    short: t('modes.classic.short'),
    assists: false,
  },
];

export const DEFAULT_MODE: ModeId = 'pure';

export function modeById(id: ModeId): Mode {
  const mode = MODES.find((candidate) => candidate.id === id);
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}
