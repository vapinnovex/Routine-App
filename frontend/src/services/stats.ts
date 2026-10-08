import { resolveForDate, resolveOccurrence, isOccurrenceComplete } from "@/services/occurrences";
import { occursOnDate } from "@/services/recurrence";
import type { Task, TaskOccurrence, TimerHistoryEntry } from "@/types/models";
import {
    eachDateKey,
    parseDateKey,
    todayKey,
    toDateKey,
    weekdayLabel,
} from "@/utils/dates";
import { percent } from "@/utils/format";

export interface DayProgress {
  date: string;
  total: number;
  completed: number;
  rate: number | null;
}

export interface MonthlyStats {
  monthLabel: string;
  year: number;
  monthIndex: number;
  overallCompletion: number;
  tasksCompleted: number;
  tasksTotal: number;
  bestDay: string | null;
  worstDay: string | null;
  bestStreak: number;
  currentStreak: number;
  days: DayProgress[];
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  currentStreak: number;
  bestStreak: number;
  mostProductiveDay: string | null;
  mostCompletedCategory: string | null;
  missedTasks: number;
  categoryRates: Array<{
    category: string;
    completed: number;
    total: number;
    rate: number;
  }>;
}

export interface FocusInsights {
  totalFocusSeconds: number;
  focusTodaySeconds: number;
  focusThisWeekSeconds: number;
  focusThisMonthSeconds: number;
  consistencyScore: number;
  bestFocusHour: number | null;
  recommendation: string;
}

export interface TaskStreaks {
  current: number;
  best: number;
  completed: number;
}

export function taskStreaks(
  task: Task,
  occurrences: Record<string, TaskOccurrence>,
  throughDate = todayKey(),
): TaskStreaks {
  const start = task.date > throughDate ? throughDate : task.date;
  const days = eachDateKey(start, throughDate);
  let current = 0;
  let best = 0;
  let run = 0;
  let completed = 0;
  for (const date of days) {
    if (!occursOnDate(task, date)) continue;
    const occurrence = occurrences[`${task.id}:${date}`];
    const done =
      Boolean(occurrence && isOccurrenceComplete(task, occurrence));
    if (done) {
      completed += 1;
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const date = days[index];
    if (!occursOnDate(task, date)) continue;
    const occurrence = occurrences[`${task.id}:${date}`];
    if (
      occurrence && isOccurrenceComplete(task, occurrence)
    ) {
      current += 1;
    } else if (date !== throughDate) {
      break;
    }
  }
  return { current, best, completed };
}

export function taskMonthProgress(
  task: Task,
  occurrences: Record<string, TaskOccurrence>,
  year: number,
  monthIndex: number,
): DayProgress[] {
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return eachDateKey(start, end).map((date) => {
    const valid = occursOnDate(task, date);
    const occurrence = occurrences[`${task.id}:${date}`];
    const completed =
      valid &&
      occurrence && isOccurrenceComplete(task, occurrence)
        ? 1
        : 0;
    return {
      date,
      total: valid ? 1 : 0,
      completed,
      rate: valid && date <= todayKey() ? completed : null,
    };
  });
}

export function focusInsights(
  history: TimerHistoryEntry[],
  through = new Date(),
): FocusInsights {
  const startOfToday = new Date(
    through.getFullYear(),
    through.getMonth(),
    through.getDate(),
  ).getTime();
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - ((through.getDay() + 6) % 7));
  const startOfWeek = weekStart.getTime();
  history = history.filter((entry) => {
    const stamp = new Date(entry.startedAt).getTime();
    return Number.isFinite(stamp) && stamp <= through.getTime();
  });
  const startOfMonth = new Date(
    through.getFullYear(),
    through.getMonth(),
    1,
  ).getTime();
  const completedDays = new Set<string>();
  const hourCounts = new Map<number, number>();
  let totalFocusSeconds = 0;
  let focusTodaySeconds = 0;
  let focusThisWeekSeconds = 0;
  let focusThisMonthSeconds = 0;
  for (const entry of history) {
    const startedAt = new Date(entry.startedAt);
    const timestamp = startedAt.getTime();
    const duration = Math.max(0, entry.durationSeconds);
    totalFocusSeconds += duration;
    if (timestamp >= startOfToday) focusTodaySeconds += duration;
    if (timestamp >= startOfWeek) focusThisWeekSeconds += duration;
    if (timestamp >= startOfMonth) focusThisMonthSeconds += duration;
    if (duration > 0) completedDays.add(toDateKey(startedAt));
    hourCounts.set(
      startedAt.getHours(),
      (hourCounts.get(startedAt.getHours()) ?? 0) + duration,
    );
  }
  const bestFocusHour =
    [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const earliest = history.length
    ? new Date(
        Math.min(
          ...history.map((entry) => new Date(entry.startedAt).getTime()),
        ),
      )
    : through;
  const earliestDay = new Date(
    earliest.getFullYear(),
    earliest.getMonth(),
    earliest.getDate(),
  ).getTime();
  const activeDays = Math.max(
    1,
    eachDateKey(toDateKey(new Date(earliestDay)), toDateKey(through)).length,
  );
  const consistencyScore = Math.min(
    100,
    Math.round((completedDays.size / activeDays) * 100),
  );
  const averageSession = history.length
    ? totalFocusSeconds / history.length
    : 0;
  const recommendation =
    history.length === 0
      ? "Complete a timer session to unlock personal insights."
      : averageSession <= 20 * 60
        ? "Short focused routines are working well. Keep the momentum."
        : "Try pairing one shorter routine with your longer sessions for consistency.";
  return {
    totalFocusSeconds,
    focusTodaySeconds,
    focusThisWeekSeconds,
    focusThisMonthSeconds,
    consistencyScore,
    bestFocusHour,
    recommendation,
  };
}

function dayProgress(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  date: string,
): DayProgress {
  const resolved = resolveForDate(tasks, occurrences, date);
  const total = resolved.length;
  // Union by task ID: preserved history can overlap the current schedule.
  const completedIds = new Set(resolved.filter((item) => item.isComplete).map((item) => item.task.id));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  for (const occurrence of Object.values(occurrences)) {
    const task = taskById.get(occurrence.taskId);
    if (task && occurrence.date === date && isOccurrenceComplete(task, occurrence)) {
      completedIds.add(task.id);
    }
  }
  const scheduledIds = new Set(resolved.map((item) => item.task.id));
  const adjustedTotal = total + [...completedIds].filter((id) => !scheduledIds.has(id)).length;
  const completed = completedIds.size;
  return { date, total: adjustedTotal, completed,
    rate: adjustedTotal === 0 ? null : completed / adjustedTotal };

}

export function monthStats(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  year: number,
  monthIndex: number,
  throughDate = todayKey(),
): MonthlyStats {
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;
  const days = eachDateKey(start, end).map((date) =>
    dayProgress(tasks, occurrences, date),
  );
  for (const day of days) {
    if (day.date > throughDate) { day.completed = 0; day.rate = null; }
  }
  const elapsed = days.filter((day) => day.date <= throughDate);
  const countable = elapsed.filter((day) => day.total > 0);
  const tasksTotal = countable.reduce((sum, day) => sum + day.total, 0);
  const tasksCompleted = countable.reduce((sum, day) => sum + day.completed, 0);
  const overallCompletion = percent(tasksCompleted, tasksTotal);

  let bestDay: DayProgress | null = null;
  let worstDay: DayProgress | null = null;
  for (const day of countable) {
    if (
      !bestDay ||
      day.completed > bestDay.completed ||
      (day.completed === bestDay.completed &&
        (day.rate ?? 0) > (bestDay.rate ?? 0))
    ) {
      bestDay = day;
    }
    if (!worstDay || (day.rate ?? 1) < (worstDay.rate ?? 1)) {
      worstDay = day;
    }
  }

  return {
    monthLabel: new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    year,
    monthIndex,
    overallCompletion,
    tasksCompleted,
    tasksTotal,
    bestDay: bestDay && bestDay.completed > 0 ? bestDay.date : null,
    worstDay: worstDay?.date ?? null,
    bestStreak: streakFromDays(elapsed, false).best,
    currentStreak: currentStreak(tasks, occurrences, throughDate),
    days,
  };
}

function streakFromDays(
  days: DayProgress[],
  fromEnd: boolean,
): { current: number; best: number } {
  let best = 0;
  let run = 0;
  const sequence = fromEnd ? [...days].reverse() : days;
  let current = 0;
  let countingCurrent = fromEnd;

  for (const day of sequence) {
    if (day.completed >= 1) {
      run += 1;
      best = Math.max(best, run);
      if (countingCurrent) current = run;
    } else if (day.total === 0) {
      continue;
    } else {
      run = 0;
      if (fromEnd) countingCurrent = false;
    }
  }

  return { current, best };
}

export function currentStreak(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  throughDate = todayKey(),
): number {
  if (tasks.length === 0) return 0;
  const earliest = tasks.reduce(
    (min, task) => (task.date < min ? task.date : min),
    tasks[0].date,
  );
  const days = eachDateKey(earliest, throughDate).map((date) =>
    dayProgress(tasks, occurrences, date),
  );
  // Today is still in progress. A missed scheduled day breaks the run only after it ends.
  return streakFromDays(days.filter((day) => day.date !== throughDate || day.completed > 0), true).current;
}

export function bestStreak(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  throughDate = todayKey(),
): number {
  if (tasks.length === 0) return 0;
  const earliest = tasks.reduce(
    (min, task) => (task.date < min ? task.date : min),
    tasks[0].date,
  );
  const days = eachDateKey(earliest, throughDate).map((date) =>
    dayProgress(tasks, occurrences, date),
  );
  return streakFromDays(days, false).best;
}

export function computeStatistics(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  throughDate = todayKey(),
): TaskStatistics {
  if (tasks.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionPercentage: 0,
      currentStreak: 0,
      bestStreak: 0,
      mostProductiveDay: null,
      mostCompletedCategory: null,
      missedTasks: 0,
      categoryRates: [],
    };
  }

  const earliest = tasks.reduce(
    (min, task) => (task.date < min ? task.date : min),
    tasks[0].date,
  );
  const dates = eachDateKey(earliest, throughDate);
  let total = 0;
  let completed = 0;
  let missed = 0;
  const weekdayTotals = Array.from({ length: 7 }, () => ({
    completed: 0,
    total: 0,
  }));
  const categoryMap = new Map<string, { completed: number; total: number }>();

  for (const date of dates) {
    const resolved = resolveForDate(tasks, occurrences, date);
    const included = new Set(resolved.map((item) => item.task.id));
    for (const task of tasks) {
      const occurrence = occurrences[`${task.id}:${date}`];
      if (!included.has(task.id) && occurrence && isOccurrenceComplete(task, occurrence)) {
        resolved.push(resolveOccurrence(task, date, occurrence));
      }
    }
    const weekday = parseDateKey(date).getDay();
    const isPast = date < throughDate;
    for (const item of resolved) {
      total += 1;
      weekdayTotals[weekday].total += 1;
      const category = item.task.category ?? "Other";
      const bucket = categoryMap.get(category) ?? { completed: 0, total: 0 };
      bucket.total += 1;
      if (item.isComplete) {
        completed += 1;
        weekdayTotals[weekday].completed += 1;
        bucket.completed += 1;
      } else if (isPast) {
        missed += 1;
      }
      categoryMap.set(category, bucket);
    }
  }

  let bestDayIndex: number | null = null;
  let bestRate = -1;
  let bestCompleted = -1;
  weekdayTotals.forEach((value, day) => {
    if (value.total === 0) return;
    const rate = value.completed / value.total;
    if (
      rate > bestRate ||
      (rate === bestRate && value.completed > bestCompleted)
    ) {
      bestDayIndex = day;
      bestRate = rate;
      bestCompleted = value.completed;
    }
  });

  const categoryRates = [...categoryMap.entries()]
    .map(([category, value]) => ({
      category,
      completed: value.completed,
      total: value.total,
      rate: percent(value.completed, value.total),
    }))
    .sort((a, b) => b.rate - a.rate);

  return {
    totalTasks: total,
    completedTasks: completed,
    completionPercentage: percent(completed, total),
    currentStreak: currentStreak(tasks, occurrences, throughDate),
    bestStreak: bestStreak(tasks, occurrences, throughDate),
    mostProductiveDay:
      bestDayIndex === null ? null : weekdayLabel(bestDayIndex, true),
    mostCompletedCategory: [...categoryRates].filter((item) => item.completed > 0)
      .sort((a, b) => b.completed - a.completed || b.rate - a.rate)[0]?.category ?? null,
    missedTasks: missed,
    categoryRates,
  };
}
