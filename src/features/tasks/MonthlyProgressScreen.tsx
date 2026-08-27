import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Heatmap } from "@/components/tasks/Heatmap";
import { MonthCalendar } from "@/components/tasks/MonthCalendar";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { resolveForDate } from "@/services/occurrences";
import { computeStatistics, monthStats } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { addMonths, formatShortDate, todayKey } from "@/utils/dates";

export function MonthlyProgressScreen() {
  const { colors } = useAppTheme();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const stats = useMemo(
    () =>
      monthStats(tasks, occurrences, cursor.getFullYear(), cursor.getMonth()),
    [cursor, occurrences, tasks],
  );
  const overall = useMemo(
    () => computeStatistics(tasks, occurrences),
    [occurrences, tasks],
  );
  const selectedItems = resolveForDate(tasks, occurrences, selectedDate);

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <AppText color={colors.primary}>Back</AppText>
      </Pressable>
      <View style={styles.head}>
        <Pressable
          onPress={() => setCursor((date) => addMonths(date, -1))}
          accessibilityLabel="Previous month"
        >
          <AppText variant="heading">‹</AppText>
        </Pressable>
        <AppText variant="heading">{stats.monthLabel}</AppText>
        <Pressable
          onPress={() => setCursor((date) => addMonths(date, 1))}
          accessibilityLabel="Next month"
        >
          <AppText variant="heading">›</AppText>
        </Pressable>
      </View>
      <Card style={styles.calendarCard}>
        <AppText variant="caption" muted>
          Calendar
        </AppText>
        <MonthCalendar
          year={stats.year}
          monthIndex={stats.monthIndex}
          days={stats.days}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
        <AppText variant="subheading" style={{ marginTop: spacing.md }}>
          {formatShortDate(selectedDate)}
        </AppText>
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <TaskRow
              key={item.task.id}
              item={item}
              onToggle={() => toggle(item.task.id, selectedDate)}
              onPress={() =>
                router.push({
                  pathname: "/task/[id]",
                  params: { id: item.task.id, date: selectedDate },
                })
              }
              disabled={selectedDate > todayKey()}
            />
          ))
        ) : (
          <AppText muted>No tasks scheduled for this date.</AppText>
        )}
      </Card>
      {stats.tasksTotal === 0 ? (
        <EmptyState
          title="No task activity yet."
          body="Add tasks to start seeing monthly progress."
          actionLabel="Add Task"
          onAction={() => router.push("/task/edit")}
        />
      ) : (
        <>
          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <AppText variant="caption" muted>
              Overall completion
            </AppText>
            <AppText variant="display">{stats.overallCompletion}%</AppText>
            <ProgressBar value={stats.overallCompletion / 100} />
            <AppText>
              Tasks completed {stats.tasksCompleted} / {stats.tasksTotal}
            </AppText>
            <AppText muted>
              Best day {stats.bestDay ? formatShortDate(stats.bestDay) : "—"}
            </AppText>
            <AppText muted>Best streak {stats.bestStreak} days</AppText>
          </Card>
          <Card style={{ marginTop: spacing.md }}>
            <AppText
              variant="caption"
              muted
              style={{ marginBottom: spacing.sm }}
            >
              Activity
            </AppText>
            <Heatmap days={stats.days} />
          </Card>
        </>
      )}
      <Card style={{ marginTop: spacing.md, gap: spacing.xs }}>
        <AppText variant="caption" muted>
          All-time
        </AppText>
        <AppText>Current streak {overall.currentStreak} days</AppText>
        <AppText>Best streak {overall.bestStreak} days</AppText>
        <AppText>
          Most productive day {overall.mostProductiveDay ?? "—"}
        </AppText>
        <AppText>
          Most completed category {overall.mostCompletedCategory ?? "—"}
        </AppText>
        <AppText>Missed tasks {overall.missedTasks}</AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  calendarCard: { gap: spacing.xs },
});
