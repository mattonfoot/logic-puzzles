import * as Haptics from 'expo-haptics';

/** Haptics are a nicety — never let a missing motor break the game loop. */
function safely(run: () => Promise<unknown>): void {
  try {
    void run().catch(() => undefined);
  } catch {
    // ignored
  }
}

export const haptics = {
  tap: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safely(() => Haptics.selectionAsync()),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
