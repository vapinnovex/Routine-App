import Constants from "expo-constants";
import { Platform } from "react-native";

import { scheduledTasksForDate } from "@/services/occurrences";
import { upcomingNotifications } from "@/services/timerEngine";
import type { ActiveTimerState, Task } from "@/types/models";
import { addDays, parseDateKey, toDateKey, todayKey } from "@/utils/dates";

type NotificationsModule = typeof import("expo-notifications");
type NotificationTriggerInput =
  import("expo-notifications").NotificationTriggerInput;

const TRIGGER_TYPES = {
  DATE: "date",
  TIME_INTERVAL: "timeInterval",
} as const;

let notifications: NotificationsModule | null = null;
let configured = false;
const notificationSound =
  Constants.appOwnership === "expo" ? "default" : "chime.wav";

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
  if (Platform.OS === "android") {
    if (typeof module.setNotificationChannelAsync === "function") {
      await module.setNotificationChannelAsync("timer", {
        name: "Timer alerts",
        importance: module.AndroidImportance?.HIGH ?? 6,
        sound: notificationSound,
        vibrationPattern: [0, 250, 250, 250],
      });
      await module.setNotificationChannelAsync("tasks", {
        name: "Task reminders",
        importance: module.AndroidImportance?.DEFAULT ?? 5,
        sound: notificationSound,
      });
    }
  }
  module.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (typeof module.setNotificationCategoryAsync === "function") {
    await module.setNotificationCategoryAsync("task-reminder", [
      { identifier: "snooze-10", buttonTitle: "Snooze 10 min" },
      {
        identifier: "skip-today",
        buttonTitle: "Skip today",
        options: { isDestructive: true },
      },
    ]);
  }
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
  return (
    next.granted ||
    next.ios?.status === module.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function cancelTimerNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const module = await getNotifications();
  if (!module) return;
  const scheduled = await module.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === "timer")
      .map((item) => module.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function cancelTaskNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const module = await getNotifications();
  if (!module) return;
  const scheduled = await module.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === "task")
      .map((item) => module.cancelScheduledNotificationAsync(item.identifier)),
  );
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
  if (typeof module.scheduleNotificationAsync !== "function") return;
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
        sound: notificationSound,
        data: { kind: "timer" },
      },
      trigger: {
        type: TRIGGER_TYPES.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: "timer",
      } as NotificationTriggerInput,
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
  await cancelTaskNotifications();
  if (!enabled) return;
  if (typeof module.scheduleNotificationAsync !== "function") return;
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
        sound: notificationSound,
        categoryIdentifier: "task-reminder",
        data: {
          kind: "task",
          taskId: task.id,
          taskTitle: task.title,
          date: toDateKey(date),
        },
      },
      trigger: {
        type: TRIGGER_TYPES.DATE,
        date,
        channelId: "tasks",
      } as NotificationTriggerInput,
    });
  }
}

export async function handleNotificationResponse(
  response: {
    actionIdentifier: string;
    notification: { request: { content: { data?: Record<string, unknown> } } };
  },
  onSkipTask: (taskId: string, date: string) => void,
): Promise<void> {
  const data = response.notification.request.content.data;
  if (data?.kind !== "task" || typeof data.taskId !== "string") return;
  const date = typeof data.date === "string" ? data.date : todayKey();
  if (response.actionIdentifier === "skip-today") {
    onSkipTask(data.taskId, date);
    return;
  }
  if (response.actionIdentifier !== "snooze-10") return;
  const module = await getNotifications();
  if (!module) return;
  const taskTitle =
    typeof data.taskTitle === "string" ? data.taskTitle : "Task";
  await module.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${taskTitle}`,
      body: "Your snoozed task is waiting.",
      sound: notificationSound,
      data: { kind: "task", taskId: data.taskId, taskTitle, date },
    },
    trigger: {
      type: TRIGGER_TYPES.TIME_INTERVAL,
      seconds: 10 * 60,
      repeats: false,
      channelId: "tasks",
    } as NotificationTriggerInput,
  });
}
