import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

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
import { resolveForDate, resolveOccurrence } from "@/services/occurrences";
import { nextOccurrenceDates } from "@/services/recurrence";
import { monthStats } from "@/services/stats";
import { useTaskStore } from "@/store/taskStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatShortDate, todayKey } from "@/utils/dates";
import { occurrenceId } from "@/utils/id";

type Tab = "today" | "upcoming" | "done" | "calendar";

export function TasksScreen() {
  const { colors } = useAppTheme();
  const preferences = usePreferences();
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const toggle = useTaskStore((state) => state.toggleTaskComplete);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const moveTask = useTaskStore((state) => state.moveTask);
  const [tab, setTab] = useState<Tab>("today");
  const today = todayKey();
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const stats = useMemo(
    () => monthStats(tasks, occurrences, now.getFullYear(), now.getMonth()),
    [tasks, occurrences, now],
  );
  const todayItems = resolveForDate(tasks, occurrences, today);
  const calendarItems = resolveForDate(tasks, occurrences, selectedDate);
  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => !task.archived)
        .flatMap((task) =>
          nextOccurrenceDates(task, today, 8)
            .filter((date) => date !== today)
            .slice(0, 3)
            .map((date) => ({
              date,
              item: resolveOccurrence(
                task,
                date,
                occurrences[occurrenceId(task.id, date)],
              ),
            })),
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.item.task.title.localeCompare(b.item.task.title),
        )
        .slice(0, 24),
    [occurrences, tasks, today],
  );
  const completed = useMemo(
    () =>
      Object.values(occurrences)
        .filter(
          (item) => item.status === "completed" || item.parentManuallyCompleted,
        )
        .map((item) => {
          const task = tasks.find((entry) => entry.id === item.taskId);
          return task
            ? {
                date: item.date,
                item: resolveOccurrence(task, item.date, item),
              }
            : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [occurrences, tasks],
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
        onLongPress={() => moveTask(item.task.id, index === 0 ? 1 : -1)}
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
          { value: "upcoming", label: "Upcoming" },
          { value: "done", label: "Done" },
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
      {tab === "upcoming" ? (
        upcoming.length ? (
          <View style={{ marginTop: spacing.md }}>
            {upcoming.map(({ date, item }, index) => (
              <View key={`${item.task.id}-${date}`}>
                <AppText variant="caption" muted>
                  {formatShortDate(date)}
                </AppText>
                {row(item, date, index)}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Nothing upcoming."
            body="Add a repeating task or schedule something for later."
          />
        )
      ) : null}
      {tab === "done" ? (
        completed.length ? (
          <View style={{ marginTop: spacing.md }}>
            {completed.map(({ date, item }, index) => (
              <View key={`${item.task.id}-${date}`}>
                <AppText variant="caption" muted>
                  {formatShortDate(date)}
                </AppText>
                {row(item, date, index)}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No completed tasks yet."
            body="Finish a task today and it will show up here."
          />
        )
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
              year={now.getFullYear()}
              monthIndex={now.getMonth()}
              days={stats.days}
              selected={selectedDate}
              onSelect={setSelectedDate}
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
