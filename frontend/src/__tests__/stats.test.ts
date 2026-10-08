import {
    taskStreaks,
    bestStreak,
    currentStreak,
    focusInsights,
    monthStats,
} from "../services/stats";
import type { Task, TaskOccurrence } from "../types/models";

function task(id: string, date: string): Task {
  return {
    id,
    title: id,
    category: "Work",
    date,
    time: null,
    recurrence: { frequency: "none" },
    priority: "medium",
    estimatedDurationMinutes: null,
    linkedTimerSessionId: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    archived: false,
    subtasks: [],
  };
}

function completed(taskId: string, date: string): TaskOccurrence {
  return {
    id: `${taskId}:${date}`,
    taskId,
    date,
    status: "completed",
    completedAt: `${date}T12:00:00.000Z`,
    subtaskCompletions: {},
    parentManuallyCompleted: true,
  };
}

describe("monthly calculations", () => {
  it("chooses best day by completed task count before completion rate", () => {
    const tasks = [
      task("a", "2026-08-01"),
      task("b", "2026-08-02"),
      task("c", "2026-08-02"),
      task("d", "2026-08-02"),
      task("e", "2026-08-02"),
      task("f", "2026-08-02"),
    ];
    const occurrences = {
      "a:2026-08-01": completed("a", "2026-08-01"),
      "b:2026-08-02": completed("b", "2026-08-02"),
      "c:2026-08-02": completed("c", "2026-08-02"),
      "d:2026-08-02": completed("d", "2026-08-02"),
      "e:2026-08-02": completed("e", "2026-08-02"),
    };
    expect(monthStats(tasks, occurrences, 2026, 7).bestDay).toBe("2026-08-02");
  });

  it("ignores empty days when averaging completion", () => {
    const tasks = [task("a", "2026-08-01"), task("b", "2026-08-02")];
    const occurrences = {
      "a:2026-08-01": completed("a", "2026-08-01"),
    };
    const stats = monthStats(tasks, occurrences, 2026, 7);
    expect(stats.tasksTotal).toBe(2);
    expect(stats.tasksCompleted).toBe(1);
    expect(stats.overallCompletion).toBe(50);
    expect(
      stats.days.find((day) => day.date === "2026-08-03")?.rate,
    ).toBeNull();
  });

  it("counts a streak only when at least one task is completed", () => {
    const tasks = [
      task("a", "2026-08-01"),
      task("b", "2026-08-02"),
      task("c", "2026-08-03"),
    ];
    const occurrences = {
      "a:2026-08-01": completed("a", "2026-08-01"),
      "b:2026-08-02": completed("b", "2026-08-02"),
    };
    expect(currentStreak(tasks, occurrences, "2026-08-03")).toBe(2);
    expect(bestStreak(tasks, occurrences, "2026-08-03")).toBe(2);
  });

  it("does not break a streak on days with no scheduled tasks", () => {
    const tasks = [task("a", "2026-08-01"), task("c", "2026-08-03")];
    const occurrences = {
      "a:2026-08-01": completed("a", "2026-08-01"),
      "c:2026-08-03": completed("c", "2026-08-03"),
    };
    expect(currentStreak(tasks, occurrences, "2026-08-03")).toBe(2);
  });

  it("summarizes timer history into useful focus insights", () => {
    const insights = focusInsights(
      [
        {
          id: "h1",
          sessionId: "s1",
          sessionName: "Focus",
          taskId: null,
          taskDate: null,
          startedAt: "2026-08-18T09:00:00.000",
          completedAt: "2026-08-18T09:25:00.000",
          durationSeconds: 1500,
          completedSectionCount: 1,
        },
      ],
      new Date("2026-08-18T12:00:00.000"),
    );
    expect(insights.totalFocusSeconds).toBe(1500);
    expect(insights.focusTodaySeconds).toBe(1500);
    expect(insights.bestFocusHour).toBe(9);
    expect(insights.consistencyScore).toBe(100);
  });
});

it('keeps today open but breaks the streak after a missed scheduled day ends', () => {
  const daily = { ...task('daily', '2026-08-01'), recurrence: { frequency: 'daily' as const } };
  const records = { 'daily:2026-08-01': completed('daily', '2026-08-01') };
  expect(currentStreak([daily], records, '2026-08-02')).toBe(1);
  expect(currentStreak([daily], records, '2026-08-03')).toBe(0);
});

it('excludes future scheduled tasks from monthly completion and best/worst day', () => {
  const daily = { ...task('daily', '2026-08-01'), recurrence: { frequency: 'daily' as const } };
  const records = { 'daily:2026-08-01': completed('daily', '2026-08-01') };
  const stats = monthStats([daily], records, 2026, 7, '2026-08-01');
  expect(stats.tasksTotal).toBe(1);
  expect(stats.overallCompletion).toBe(100);
  expect(stats.days[1].rate).toBeNull();
  expect(stats.days[1].total).toBe(1); // Future schedule remains visible in the calendar.
  expect(stats.bestDay).toBe('2026-08-01');
});

it('unions historical and scheduled completions without rates above 100%', () => {
  const tasks = [task('moved', '2026-08-02'), task('current', '2026-08-01')];
  const records = { 'moved:2026-08-01': completed('moved', '2026-08-01'), 'current:2026-08-01': completed('current', '2026-08-01') };
  const day = monthStats(tasks, records, 2026, 7, '2026-08-01').days[0];
  expect(day).toMatchObject({ total: 2, completed: 2, rate: 1 });
});

it('counts recurring task streaks across rest days with a grace period today', () => {
  const weekly = { ...task('weekly', '2026-08-03'), recurrence: { frequency: 'weekly' as const } };
  const records = { 'weekly:2026-08-03': completed('weekly', '2026-08-03') };
  expect(taskStreaks(weekly, records, '2026-08-10')).toEqual({ current: 1, best: 1, completed: 1 });
  expect(taskStreaks(weekly, records, '2026-08-11').current).toBe(0);
});

it('uses local dates for focus consistency around midnight', () => {
  const entries = [1, 2].map((day) => ({ id: String(day), sessionId: 's', sessionName: 'Focus', taskId: null, taskDate: null,
    startedAt: new Date(2026, 7, day, day === 1 ? 23 : 1).toISOString(), completedAt: new Date(2026, 7, day, day === 1 ? 23 : 1, 10).toISOString(), durationSeconds: 600, completedSectionCount: 1 }));
  expect(focusInsights(entries, new Date(2026, 7, 2, 12)).consistencyScore).toBe(100);
});
