import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { MonthCalendar } from "@/components/tasks/MonthCalendar";
import { SubtaskRow } from "@/components/tasks/SubtaskRow";
import { CountdownOverlay } from "@/components/timer/CountdownOverlay";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { successHaptic, tapHaptic } from "@/services/feedback";
import { resolveOccurrence } from "@/services/occurrences";
import { describeRecurrence, occursOnDate } from "@/services/recurrence";
import { taskMonthProgress, taskStreaks } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useToastStore } from "@/store/toastStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import {
    addMonths,
    formatShortDate,
    formatTime,
    todayKey,
} from "@/utils/dates";
import { occurrenceId } from "@/utils/id";

export function TaskDetailScreen() {
  const { colors } = useAppTheme();
  const preferences = usePreferences();
  const { id, date: dateParam } = useLocalSearchParams<{
    id: string;
    date?: string;
  }>();
  const date = Array.isArray(dateParam)
    ? dateParam[0]
    : (dateParam ?? todayKey());
  const taskId = Array.isArray(id) ? id[0] : id;
  const task = useTaskStore((state) =>
    state.tasks.find((item) => item.id === taskId),
  );
  const stored = useTaskStore((state) =>
    taskId ? state.occurrences[occurrenceId(taskId, date)] : undefined,
  );
  const toggleTask = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSub = useTaskStore((state) => state.toggleSubtask);
  const addSubtask = useTaskStore((state) => state.addSubtask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const skipTask = useTaskStore((state) => state.skipTask);
  const occurrences = useTaskStore((state) => state.occurrences);
  const startSession = useTimerStore((state) => state.startSession);
  const [confirm, setConfirm] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [countdown, setCountdown] = useState(false);
  const [historyCursor, setHistoryCursor] = useState(() => new Date());

  if (!task) {
    return (
      <Screen>
        <AppText>This task is no longer available.</AppText>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const resolved = resolveOccurrence(task, date, stored);
  const time = formatTime(task.time);
  const completedCount = Object.values(occurrences).filter(
    (item) =>
      item.taskId === task.id &&
      (item.status === "completed" || item.parentManuallyCompleted),
  ).length;
  const streaks = taskStreaks(task, occurrences);
  const historyDays = taskMonthProgress(
    task,
    occurrences,
    historyCursor.getFullYear(),
    historyCursor.getMonth(),
  );

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityLabel="Back">
        <AppText color={colors.primary}>Back</AppText>
      </Pressable>
      <AppText variant="display" style={{ marginTop: spacing.sm }}>
        {task.title}
      </AppText>
      <AppText muted>
        {date === todayKey() ? "Today" : date}
        {time ? ` · ${time}` : ""}
      </AppText>
      <View style={{ height: spacing.sm }} />
      <CategoryBadge label={task.category} />

      <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <AppText variant="caption" muted>
          Progress
        </AppText>
        <AppText variant="heading">
          {resolved.totalSubtasks > 0
            ? `${resolved.completedCount} / ${resolved.totalSubtasks}`
            : resolved.isComplete
              ? "Complete"
              : "Open"}
        </AppText>
        <AppText muted>
          Completed perfectly {completedCount}{" "}
          {completedCount === 1 ? "time" : "times"}
        </AppText>
        <Button
          label={resolved.isComplete ? "Mark incomplete" : "Mark complete"}
          variant={resolved.isComplete ? "secondary" : "primary"}
          onPress={() => {
            toggleTask(task.id, date);
            void successHaptic(preferences);
          }}
        />
        {!resolved.isComplete && !resolved.isSkipped && date <= todayKey() ? (
          <Button
            label="Skip for today"
            variant="secondary"
            onPress={() => {
              skipTask(task.id, date);
              useToastStore.getState().show("Skipped for today");
            }}
          />
        ) : null}
        {task.linkedTimerSessionId ? (
          <Button
            label="Start linked timer"
            variant="secondary"
            onPress={() => setCountdown(true)}
          />
        ) : null}
      </Card>

      <View style={styles.subtaskHeader}>
        <View>
          <AppText variant="subheading">Subtasks</AppText>
          <AppText variant="caption" muted>
            Break this task into smaller steps.
          </AppText>
        </View>
        <AppText variant="caption" color={colors.secondary}>
          {resolved.completedCount}/{resolved.totalSubtasks}
        </AppText>
      </View>
      <Card style={styles.subtaskCard}>
        {resolved.subtasks.length === 0 ? (
          <AppText muted>No subtasks yet.</AppText>
        ) : (
          resolved.subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              title={subtask.title}
              completed={subtask.completed}
              onToggle={() => {
                toggleSub(task.id, date, subtask.id);
                void tapHaptic(preferences);
              }}
            />
          ))
        )}
        <View
          style={[
            styles.subtaskComposer,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="caption" muted>
            Add a step
          </AppText>
          <TextInput
            value={newSub}
            onChangeText={setNewSub}
            placeholder="e.g. Pack water bottle"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!newSub.trim()) return;
              addSubtask(task.id, newSub);
              setNewSub("");
              useToastStore.getState().show("Subtask added");
            }}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />
          <Button
            label="Add subtask"
            onPress={() => {
              if (!newSub.trim()) return;
              addSubtask(task.id, newSub);
              setNewSub("");
              useToastStore.getState().show("Subtask added");
            }}
          />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md, gap: spacing.xs }}>
        <AppText variant="caption" muted>
          Repeat
        </AppText>
        <AppText>{describeRecurrence(task.recurrence, task.date)}</AppText>
      </Card>

      <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <AppText variant="caption" muted>
          Task history
        </AppText>
        <View style={styles.historySummary}>
          <View>
            <AppText variant="heading">{streaks.current}</AppText>
            <AppText variant="caption" muted>
              Current streak
            </AppText>
          </View>
          <View>
            <AppText variant="heading">{streaks.best}</AppText>
            <AppText variant="caption" muted>
              Best streak
            </AppText>
          </View>
          <View>
            <AppText variant="heading">{streaks.completed}</AppText>
            <AppText variant="caption" muted>
              Perfect days
            </AppText>
          </View>
        </View>
        <View style={styles.historyHeader}>
          <Pressable
            onPress={() => setHistoryCursor((value) => addMonths(value, -1))}
            accessibilityLabel="Previous task month"
          >
            <AppText variant="heading">‹</AppText>
          </Pressable>
          <AppText variant="subheading">
            {formatShortDate(
              `${historyCursor.getFullYear()}-${String(historyCursor.getMonth() + 1).padStart(2, "0")}-01`,
            )}
          </AppText>
          <Pressable
            onPress={() => setHistoryCursor((value) => addMonths(value, 1))}
            accessibilityLabel="Next task month"
          >
            <AppText variant="heading">›</AppText>
          </Pressable>
        </View>
        <MonthCalendar
          year={historyCursor.getFullYear()}
          monthIndex={historyCursor.getMonth()}
          days={historyDays}
          selected={date}
          onSelect={() => undefined}
          getDayStatus={(day) => {
            if (!occursOnDate(task, day)) return "invalid";
            if (day > todayKey()) return "future";
            const occurrence = occurrences[occurrenceId(task.id, day)];
            if (
              occurrence?.status === "completed" ||
              occurrence?.parentManuallyCompleted
            ) {
              return "completed";
            }
            return "missed";
          }}
          onMonthChange={(direction) =>
            setHistoryCursor((value) => addMonths(value, direction))
          }
        />
        <AppText variant="caption" muted>
          Green dates are valid task days completed perfectly. Days outside this
          task's schedule are not counted in streaks.
        </AppText>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Edit"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/task/edit", params: { id: task.id } })
          }
        />
        <Button
          label="Delete"
          variant="danger"
          onPress={() => setConfirm(true)}
        />
      </View>

      <ConfirmationDialog
        visible={confirm}
        title="Delete this task?"
        message="This removes the task and its history on this device."
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          deleteTask(task.id);
          setConfirm(false);
          useToastStore.getState().show("Task deleted");
          router.back();
        }}
      />
      {task.linkedTimerSessionId ? (
        <CountdownOverlay
          visible={countdown}
          label={`Get ready for ${task.title}`}
          onCancel={() => setCountdown(false)}
          onComplete={() => {
            setCountdown(false);
            const active = startSession(
              task.linkedTimerSessionId!,
              task.id,
              date,
            );
            if (active) router.push("/session/run");
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  subtaskCard: { gap: spacing.xs },
  subtaskComposer: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  historySummary: { flexDirection: "row", justifyContent: "space-between" },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
