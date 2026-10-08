import { useTodayKey } from "@/hooks/useTodayKey";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

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
import { describeRecurrence, occursOnDate } from "@/services/recurrence";
import { monthStats } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatShortDate, formatMonthYear, todayKey } from "@/utils/dates";

type Tab = "today" | "all" | "calendar";

export function TasksScreen() {
  const { colors } = useAppTheme();
  const preferences = usePreferences();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const [tab, setTab] = useState<Tab>("today");
  const [query, setQuery] = useState("");
  const matchingTasks = tasks.filter((task) => !task.archived && `${task.title} ${task.category ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const today = useTodayKey();
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
    [calendarCursor, occurrences, tasks, today],
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
  const changeMonth = (direction: -1 | 1) => {
    const next = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + direction, 1);
    setCalendarCursor(next);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  };
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
          { value: "all", label: "All tasks" },
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
      {tab === "all" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search tasks"
            placeholder="Search tasks or categories" placeholderTextColor={colors.textSecondary}
            style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.textPrimary, backgroundColor: colors.surface, fontSize: 16 }} />
          <AppText variant="caption" muted>{matchingTasks.length} {matchingTasks.length === 1 ? "task" : "tasks"} · Includes past and upcoming routines</AppText>
          {matchingTasks.map((task) => <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open ${task.title}`}
            onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id, date: occursOnDate(task, today) ? today : task.date } })}>
            <Card style={{ gap: spacing.xs }}>
              <AppText variant="subheading">{task.title}</AppText>
              <AppText muted>{describeRecurrence(task.recurrence, task.date)} · {task.category ?? "Uncategorized"}</AppText>
              <AppText variant="caption" color={colors.primary}>{formatShortDate(task.date)} · View task →</AppText>
            </Card>
          </Pressable>)}
          {matchingTasks.length === 0 && <EmptyState title={query ? "No matching tasks" : "Your routines start here"}
            body={query ? "Try a different name or category." : "Add a task to plan your day."}
            actionLabel={query ? "Clear search" : "Add task"} onAction={() => query ? setQuery("") : router.push("/task/edit")} />}
        </View>
      ) : null}
      {tab === "calendar" ? (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          <Card>
            <View style={styles.head}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}><AppText variant="heading">‹</AppText></Pressable>
              <AppText variant="subheading">{formatMonthYear(calendarCursor)}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} style={{ minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}><AppText variant="heading">›</AppText></Pressable>
            </View>
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
              onMonthChange={changeMonth}
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
