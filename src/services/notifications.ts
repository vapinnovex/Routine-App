import { Platform } from "react-native";

import { upcomingNotifications } from "@/services/timerEngine";
import type { ActiveTimerState } from "@/types/models";

type NotificationsModule = typeof import("expo-notifications");

let notifications: NotificationsModule | null = null;
let configured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (notifications) return notifications;
  try {
    notifications = await import("expo-notifications");
    return notifications;
  } catch {
    return null;
  }
}

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  if (configured) return;
  const module = await getNotifications();
  if (!module) return;
  module.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  configured = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const module = await getNotifications();
  if (!module) return false;
  await configureNotifications();
  const current = await module.getPermissionsAsync();
  if (current.granted) return true;
  const next = await module.requestPermissionsAsync();
  return next.granted;
}

export async function cancelTimerNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const module = await getNotifications();
  if (!module) return;
  await module.cancelAllScheduledNotificationsAsync();
}

export async function scheduleTimerNotifications(
  state: ActiveTimerState,
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelTimerNotifications();
  if (!enabled || state.status !== "running") return;
  const module = await getNotifications();
  if (!module) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const items = upcomingNotifications(state, Date.now());
  for (const item of items) {
    const seconds = Math.max(
      1,
      Math.round((item.fireDate.getTime() - Date.now()) / 1000),
    );
    await module.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: true,
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  }
}
