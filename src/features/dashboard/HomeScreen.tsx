import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { TaskRow } from "@/components/tasks/TaskRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet } from "@/components/ui/ModalSheet";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useGreeting } from "@/hooks/useGreeting";
import { successHaptic, tapHaptic } from "@/services/feedback";
import { currentStreak } from "@/services/stats";
import { useTaskStore, useTodayProgress } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useToastStore } from "@/store/toastStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatLongDate, todayKey } from "@/utils/dates";
import { percent } from "@/utils/format";

export function HomeScreen() {
  const { colors } = useAppTheme();
  const greeting = useGreeting();
  const preferences = usePreferences();
  const { items, completed, total } = useTodayProgress();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const createTask = useTaskStore((state) => state.createTask);
  const sessions = useTimerStore((state) => state.sessions);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const streak = currentStreak(tasks, occurrences);
  const allDone = total > 0 && completed === total;

  const completeTask = (taskId: string) => {
    toggle(taskId, todayKey());
    void successHaptic(preferences);
  };

  const addQuick = () => {
    if (!quickTitle.trim()) return;
    createTask({
      title: quickTitle,
      category: null,
      date: todayKey(),
      time: null,
      recurrence: { frequency: "none" },
      subtasks: [],
    });
    setQuickTitle("");
    setQuickOpen(false);
    useToastStore.getState().show("Task added");
    void tapHaptic(preferences);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{greeting.title}</AppText>
          <AppText muted>{formatLongDate(new Date())}</AppText>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityLabel="Settings"
          hitSlop={8}
        >
          <Icon name="settings" color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <Card>
        <View style={styles.progressRow}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="caption" muted>
              TODAY
            </AppText>
            <AppText variant="subheading">
              {total === 0
                ? "No tasks yet"
                : `${completed} / ${total} tasks completed`}
            </AppText>
            {allDone ? (
              <AppText color={colors.success}>All done for today.</AppText>
            ) : (
              <AppText muted>{percent(completed, total)}% complete</AppText>
            )}
            {streak > 0 ? (
              <View style={styles.streak}>
                <Icon name="flame" color={colors.streak} size={16} />
                <AppText variant="caption" color={colors.streak}>
                  {streak} day streak
                </AppText>
              </View>
            ) : null}
          </View>
          <ProgressRing value={total === 0 ? 0 : completed / total} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Add Task"
          onPress={() => setQuickOpen(true)}
          icon={<Icon name="plus" color={colors.textInverse} size={18} />}
          style={{ flex: 1 }}
        />
        <Button
          label="Start Timer"
          variant="secondary"
          onPress={() => {
            if (sessions.length === 0) router.push("/session/edit");
            else router.push("/(tabs)/timer");
          }}
          icon={<Icon name="play" color={colors.textPrimary} size={16} />}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.sectionHead}>
        <AppText variant="caption" muted>
          TODAY'S TASKS
        </AppText>
        <Pressable
          onPress={() => router.push("/progress")}
          accessibilityLabel="Monthly progress"
        >
          <AppText variant="caption" color={colors.primary}>
            Monthly view
          </AppText>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="No tasks for today."
          body="Create your first task and start building your routine."
          actionLabel="Add Task"
          onAction={() => setQuickOpen(true)}
        />
      ) : (
        <Card>
          {items.map((item, index) => (
            <View key={item.task.id}>
              {index > 0 ? (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              ) : null}
              <TaskRow
                item={item}
                onToggle={() => completeTask(item.task.id)}
                onSubtaskToggle={(subtaskId) =>
                  toggleSubtask(item.task.id, todayKey(), subtaskId)
                }
                onPress={() =>
                  router.push({
                    pathname: "/task/[id]",
                    params: { id: item.task.id, date: todayKey() },
                  })
                }
              />
            </View>
          ))}
        </Card>
      )}

      <BottomSheet
        visible={quickOpen}
        title="Quick task"
        onClose={() => setQuickOpen(false)}
      >
        <AppText muted>What do you need to do?</AppText>
        <TextInput
          value={quickTitle}
          onChangeText={setQuickTitle}
          placeholder="Morning workout"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          autoFocus
        />
        <AppText variant="caption" muted>
          Today · No time
        </AppText>
        <Button
          label="Add Task"
          onPress={addQuick}
          disabled={!quickTitle.trim()}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  settingsButton: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  streak: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
});
