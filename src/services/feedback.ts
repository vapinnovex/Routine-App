import type { UserPreferences } from '@/types/models';

export async function tapHaptic(preferences: UserPreferences): Promise<void> {
  if (!preferences.hapticsEnabled) return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* native module unavailable in tests / web */
  }
}

export async function successHaptic(preferences: UserPreferences): Promise<void> {
  if (!preferences.hapticsEnabled) return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* ignore */
  }
}

export async function playChime(preferences: UserPreferences): Promise<void> {
  if (!preferences.soundEnabled) return;
  try {
    const { Audio } = await import('expo-av');
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/chime.wav'),
      { shouldPlay: true, volume: 0.7 },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    /* ignore missing audio on web/tests */
  }
}
