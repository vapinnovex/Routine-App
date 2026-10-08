import { useTodayKey } from "@/hooks/useTodayKey";
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
import { computeStatistics, focusInsights, monthStats } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { addMonths, formatShortDate, todayKey, toDateKey } from "@/utils/dates";

export function MonthlyProgressScreen() {
  const { colors } = useAppTheme();
  const today = useTodayKey();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const timerHistory = useTimerStore((state) => state.history);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const changeMonth = (direction: -1 | 1) => {
    const next = addMonths(cursor, direction);
    setCursor(next);
    setSelectedDate(toDateKey(next));
  };
  const stats = useMemo(
    () =>
      monthStats(tasks, occurrences, cursor.getFullYear(), cursor.getMonth()),
    [cursor, occurrences, tasks, today],
  );
  const overall = useMemo(
    () => computeStatistics(tasks, occurrences),
    [occurrences, tasks, today],
  );
  const selectedItems = resolveForDate(tasks, occurrences, selectedDate);
  const hasCompletedActivity = stats.days.some((day) => day.completed > 0);
  const focus = useMemo(() => focusInsights(timerHistory), [timerHistory, today]);
  const hourLabel =
    focus.bestFocusHour === null
      ? "—"
      : new Date(2020, 0, 1, focus.bestFocusHour).toLocaleTimeString(
          undefined,
          { hour: "numeric" },
        );

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <AppText color={colors.primary}>Back</AppText>
      </Pressable>
      <View style={styles.head}>
        <Pressable
          onPress={() => changeMonth(-1)}
          accessibilityLabel="Previous month"
        >
          <AppText variant="heading">‹</AppText>
        </Pressable>
        <AppText variant="heading">{stats.monthLabel}</AppText>
        <Pressable
          onPress={() => changeMonth(1)}
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
          onMonthChange={changeMonth}
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
              onSubtaskToggle={(id) => toggleSubtask(item.task.id, selectedDate, id)}
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
              Completion through today
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
          {hasCompletedActivity ? (
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
          ) : null}
        </>
      )}
      <Card style={{ marginTop: spacing.md, gap: spacing.xs }}>
        <AppText variant="caption" muted>
          All-time progress
        </AppText>
        <AppText variant="caption" muted>Complete at least one task on each scheduled day. Rest days are neutral; today stays open until midnight.</AppText>
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
      <Card style={{ marginTop: spacing.md, gap: spacing.xs }}>
        <AppText variant="caption" muted>
          Focus insights
        </AppText>
        <AppText>
          Total focus {Math.round(focus.totalFocusSeconds / 60)} min
        </AppText>
        <AppText>
          Today {Math.round(focus.focusTodaySeconds / 60)} min · This week{" "}
          {Math.round(focus.focusThisWeekSeconds / 60)} min
        </AppText>
        <AppText>
          This month {Math.round(focus.focusThisMonthSeconds / 60)} min
        </AppText>
        <AppText>
          Consistency {focus.consistencyScore}% · Best focus time {hourLabel}
        </AppText>
        <AppText muted>{focus.recommendation}</AppText>
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
