import type { UserPreferences } from "@/types/models";

export async function tapHaptic(preferences: UserPreferences): Promise<void> {
  if (!preferences.hapticsEnabled) return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* native module unavailable in tests / web */
  }
}

export async function successHaptic(
  preferences: UserPreferences,
): Promise<void> {
  if (!preferences.hapticsEnabled) return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* ignore */
  }
}

export async function playChime(preferences: UserPreferences): Promise<void> {
  if (!preferences.soundEnabled) return;
  try {
    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    });
    const player = createAudioPlayer(require("../../assets/sounds/chime.wav"));
    player.volume = 0.7;
    player.play();
    setTimeout(() => player.remove(), 5000);
  } catch {
    /* ignore missing audio on web/tests */
  }
}
