import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "@/components/ui/ToastHost";
import { AccountConnection } from "@/components/AccountConnection";
import { initializeAccount } from "@/services/accountSync";
import { useConnectionStore } from "@/store/connectionStore";
import {
    cancelTimerNotifications,
    configureNotifications,
    handleNotificationResponse,
    scheduleTaskNotifications,
    scheduleTimerNotifications,
} from "@/services/notifications";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useUserStore } from "@/store/userStore";
import { AppThemeProvider, useAppTheme } from "@/theme/ThemeProvider";

export { ErrorBoundary } from "expo-router";

function HydrationGate({ children }: { children: ReactNode }) {
  const ready = useConnectionStore((state) => state.ready);
  const error = useConnectionStore((state) => state.error);
  useEffect(() => { void initializeAccount(); }, []);
  const userReady = useUserStore((state) => state.hydrated);
  const tasksReady = useTaskStore((state) => state.hydrated);
  const timerReady = useTimerStore((state) => state.hydrated);
  const { colors } = useAppTheme();

  if (!ready || !userReady || !tasksReady || !timerReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <AccountConnection />
      </View>
    );
  }
  return <>
    <AccountConnection />
    <View style={{ flex: 1 }} pointerEvents={error ? "none" : "auto"}>{children}</View>
  </>;
}

function AppEffects() {
  const { scheme } = useAppTheme();

  useEffect(() => {
    let responseSubscription: { remove: () => void } | null = null;
    void configureNotifications().then(async () => {
      if (typeof window === "undefined" && process.env.JEST_WORKER_ID) return;
      try {
        const Notifications = await import("expo-notifications");
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            (response) =>
              void handleNotificationResponse(response, (taskId, date) => {
                useTaskStore.getState().skipTask(taskId, date);
              }),
          );
      } catch {
        responseSubscription = null;
      }
    });
    const syncTasks = () => {
      const user = useUserStore.getState().user;
      const preferences = user?.preferences;
      void scheduleTimerNotifications(
        useTimerStore.getState().active,
        Boolean(
          preferences?.notificationsEnabled &&
          preferences?.timerNotificationsEnabled,
        ),
      );
      void scheduleTaskNotifications(
        useTaskStore.getState().tasks,
        Boolean(
          preferences?.notificationsEnabled &&
          preferences?.taskRemindersEnabled,
        ),
      );
    };
    syncTasks();
    return () => responseSubscription?.remove();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active") {
        useTimerStore.getState().tickCatchUp();
      } else {
        useTimerStore.getState().tickCatchUp();
        if (useTimerStore.getState().active?.status === "running") {
          /* keep scheduled notifications while running in case we background again */
        } else {
          void cancelTimerNotifications();
        }
      }
    });
    return () => sub.remove();
  }, []);

  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  const user = useUserStore((state) => state.user);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <HydrationGate>
            <AppEffects />
            <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
              <Stack.Screen name="index" />
              <Stack.Protected guard={!user}>
                <Stack.Screen name="welcome" />
              </Stack.Protected>
              <Stack.Protected guard={Boolean(user)}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="task/[id]" />
                <Stack.Screen name="task/edit" />
                <Stack.Screen name="progress" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="session/edit" />
                <Stack.Screen
                  name="session/run"
                  options={{ gestureEnabled: false, animation: "fade" }}
                />
                <Stack.Screen name="session/complete" />
              </Stack.Protected>
            </Stack>
            <ToastHost />
          </HydrationGate>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
