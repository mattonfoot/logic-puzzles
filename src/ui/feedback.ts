import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * What the app does when something happens: a sound, a buzz, or both.
 *
 * Call sites say what occurred — a tap, a mark, a win — rather than which motor
 * or file to reach for, and this decides. Both are niceties: a device with no
 * haptic motor, no speaker, or a player that will not load must cost the effect
 * and nothing else, so every path here swallows its own failures.
 *
 * The player's settings live in a module-level `voice` rather than a hook,
 * because these fire from event handlers all over the app and threading a
 * context through every one of them would buy nothing. `App` keeps it in step.
 */

const SOUNDS = {
  tap: require('../../assets/sounds/tap.wav'),
  mark: require('../../assets/sounds/mark.wav'),
  success: require('../../assets/sounds/success.wav'),
} as const;

type SoundName = keyof typeof SOUNDS;

const voice = { haptics: true, volume: 0.6 };
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let ready = false;

/** Keeps the effects in step with the settings. */
export function configureFeedback(next: { haptics: boolean; volume: number }): void {
  voice.haptics = next.haptics;
  voice.volume = next.volume;
  for (const player of Object.values(players)) {
    try {
      if (player) player.volume = next.volume;
    } catch {
      // A player that has gone away is no reason to fail a settings change.
    }
  }
}

/**
 * Loads the players once, on the first sound asked for.
 *
 * The audio mode says these are effects, not media: they mix with whatever the
 * player is listening to instead of stopping it, and they respect the silent
 * switch, because a puzzle game chirping through a muted phone is a bug.
 */
function playerFor(name: SoundName): AudioPlayer | null {
  try {
    if (!ready) {
      ready = true;
      void setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      }).catch(() => undefined);
    }
    if (!players[name]) {
      const player = createAudioPlayer(SOUNDS[name]);
      player.volume = voice.volume;
      players[name] = player;
    }
    return players[name] ?? null;
  } catch {
    return null;
  }
}

function play(name: SoundName): void {
  if (voice.volume <= 0) return;
  try {
    const player = playerFor(name);
    if (!player) return;
    player.volume = voice.volume;
    // Back to the start, so a quick run of taps sounds like a quick run of
    // taps rather than one long one.
    player.seekTo(0);
    player.play();
  } catch {
    // ignored
  }
}

function buzz(run: () => Promise<unknown>): void {
  if (!voice.haptics) return;
  try {
    void run().catch(() => undefined);
  } catch {
    // ignored
  }
}

export const feedback = {
  /** A navigation item, a button, a switch: something that moved the app. */
  tap: () => {
    play('tap');
    buzz(() => Haptics.selectionAsync());
  },

  /** A mark on the board — the sound the game makes most, so the lightest. */
  mark: () => {
    play('mark');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /**
   * A square held down until it settles into a tick.
   *
   * The same sound as any other mark — it is the same mark — over a firmer
   * knock, because a press held long enough to fire wants an answer that says
   * so. Without one the gesture is indistinguishable from a tap that took its
   * time.
   */
  settle: () => {
    play('mark');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** The puzzle is finished. */
  success: () => {
    play('success');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },

  /** Something the player will want to look at: a wrong mark, a dead end. */
  warn: () => {
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
};
