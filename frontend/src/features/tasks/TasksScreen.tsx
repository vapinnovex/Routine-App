import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Heatmap } from "@/components/tasks/Heatmap";
import { MonthCalendar } from "@/components/tasks/MonthCalendar";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/Segmented";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { successHaptic } from "@/services/feedback";
import { resolveForDate } from "@/services/occurrences";
import { monthStats } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatShortDate, todayKey } from "@/utils/dates";

type Tab = "today" | "overview" | "calendar";

export function TasksScreen() {
  const { colors } = useAppTheme();
  const preferences = usePreferences();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const [tab, setTab] = useState<Tab>("today");
  const today = todayKey();
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const stats = useMemo(
    () =>
      monthStats(
        tasks,
        occurrences,
        calendarCursor.getFullYear(),
        calendarCursor.getMonth(),
      ),
    [calendarCursor, occurrences, tasks],
  );
  const todayItems = resolveForDate(tasks, occurrences, today);
  const calendarItems = resolveForDate(tasks, occurrences, selectedDate);
  const completionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(occurrences).forEach((occurrence) => {
      if (
        occurrence.status === "completed" ||
        occurrence.parentManuallyCompleted
      ) {
        counts.set(occurrence.taskId, (counts.get(occurrence.taskId) ?? 0) + 1);
      }
    });
    return counts;
  }, [occurrences]);
  const focusItems = useMemo(
    () =>
      [...todayItems]
        .filter((item) => !item.isComplete && !item.isSkipped)
        .sort((a, b) => {
          const rank = { high: 0, medium: 1, low: 2 };
          return (
            rank[a.task.priority ?? "medium"] -
            rank[b.task.priority ?? "medium"]
          );
        })
        .slice(0, 3),
    [todayItems],
  );
  const onToggle = (taskId: string, date: string) => {
    toggle(taskId, date);
    void successHaptic(preferences);
  };
  const row = (
    item: (typeof todayItems)[number],
    date: string,
    index: number,
  ) => (
    <Card key={`${item.task.id}-${date}`} style={{ marginBottom: spacing.xs }}>
      <TaskRow
        item={item}
        onToggle={() => onToggle(item.task.id, date)}
        onPress={() =>
          router.push({
            pathname: "/task/[id]",
            params: { id: item.task.id, date },
          })
        }
        onSubtaskToggle={(subtaskId) =>
          toggleSubtask(item.task.id, date, subtaskId)
        }
        completionCount={completionCounts.get(item.task.id) ?? 0}
        disabled={date > today}
      />
    </Card>
  );

  return (
    <Screen>
      <View style={styles.head}>
        <AppText variant="heading">Tasks</AppText>
        <Pressable
          onPress={() => router.push("/task/edit")}
          accessibilityLabel="Add task"
          style={[styles.add, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" color={colors.textInverse} />
        </Pressable>
      </View>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "today", label: "Today" },
          { value: "overview", label: "Overview" },
          { value: "calendar", label: "Calendar" },
        ]}
      />
      {tab === "today" ? (
        todayItems.length ? (
          <View style={{ marginTop: spacing.md }}>
            {todayItems.map((item, index) => row(item, today, index))}
          </View>
        ) : (
          <EmptyState
            title="No tasks for today."
            body="Create your first task and start building your routine."
            actionLabel="Add Task"
            onAction={() => router.push("/task/edit")}
          />
        )
      ) : null}
      {tab === "overview" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Card style={{ gap: spacing.xs }}>
            <AppText variant="subheading">Your month at a glance</AppText>
            <AppText muted>
              {stats.overallCompletion}% complete · {stats.currentStreak} day
              current streak
            </AppText>
            <Heatmap days={stats.days} />
          </Card>
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="subheading">Top 3 for today</AppText>
            {focusItems.length ? (
              focusItems.map((item, index) => row(item, today, index))
            ) : (
              <AppText muted>
                Everything important is handled for today.
              </AppText>
            )}
          </Card>
        </View>
      ) : null}
      {tab === "calendar" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Card>
            <AppText variant="subheading">
              {formatShortDate(selectedDate)}
            </AppText>
            <AppText muted>
              {calendarItems.length}{" "}
              {calendarItems.length === 1 ? "task" : "tasks"}
            </AppText>
            <View style={{ height: spacing.md }} />
            <MonthCalendar
              year={calendarCursor.getFullYear()}
              monthIndex={calendarCursor.getMonth()}
              days={stats.days}
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={(direction) => {
                const next = new Date(
                  calendarCursor.getFullYear(),
                  calendarCursor.getMonth() + direction,
                  1,
                );
                setCalendarCursor(next);
                setSelectedDate(
                  `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`,
                );
              }}
            />
          </Card>
          {calendarItems.length ? (
            <View>
              {calendarItems.map((item, index) =>
                row(item, selectedDate, index),
              )}
            </View>
          ) : (
            <EmptyState
              title="No tasks on this day."
              body="Pick another date or add a task."
              actionLabel="Add Task"
              onAction={() =>
                router.push({
                  pathname: "/task/edit",
                  params: { date: selectedDate },
                })
              }
            />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  add: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
