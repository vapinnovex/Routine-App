import { Platform } from "react-native";

import { scheduledTasksForDate } from "@/services/occurrences";
import { upcomingNotifications } from "@/services/timerEngine";
import type { ActiveTimerState, Task } from "@/types/models";
import { addDays, parseDateKey, toDateKey } from "@/utils/dates";

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
  state: ActiveTimerState | null,
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelTimerNotifications();
  if (!enabled || !state || state.status !== "running") return;
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
        sound: "chime.wav",
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  }
}

export async function scheduleTaskNotifications(
  tasks: Task[],
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;
  const module = await getNotifications();
  if (!module) return;
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const now = new Date();
  const reminders = new Map<string, { date: Date; task: Task }>();
  for (let offset = 0; offset < 31; offset += 1) {
    const date = addDays(now, offset);
    for (const task of scheduledTasksForDate(tasks, toDateKey(date))) {
      if (!task.time || reminders.has(task.id)) continue;
      const [hours, minutes] = task.time.split(":").map(Number);
      const reminderDate = parseDateKey(toDateKey(date));
      reminderDate.setHours(hours, minutes, 0, 0);
      if (reminderDate.getTime() > now.getTime()) {
        reminders.set(task.id, { date: reminderDate, task });
      }
    }
  }

  for (const { date, task } of reminders.values()) {
    await module.scheduleNotificationAsync({
      content: {
        title: `Up next: ${task.title}`,
        body: "Your scheduled task is ready.",
        sound: "chime.wav",
      },
      trigger: {
        type: module.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }
}
