import type { Task, TaskOccurrence } from '@/types/models';
import { resolveForDate } from '@/services/occurrences';
import { eachDateKey, parseDateKey, todayKey, weekdayLabel } from '@/utils/dates';
import { percent } from '@/utils/format';

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
  categoryRates: Array<{ category: string; completed: number; total: number; rate: number }>;
}

function dayProgress(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  date: string,
): DayProgress {
  const resolved = resolveForDate(tasks, occurrences, date);
  const total = resolved.length;
  const completed = resolved.filter((item) => item.isComplete).length;
  return {
    date,
    total,
    completed,
    rate: total === 0 ? null : completed / total,
  };
}

export function monthStats(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  year: number,
  monthIndex: number,
): MonthlyStats {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
  const days = eachDateKey(start, end).map((date) => dayProgress(tasks, occurrences, date));
  const countable = days.filter((day) => day.total > 0);
  const tasksTotal = countable.reduce((sum, day) => sum + day.total, 0);
  const tasksCompleted = countable.reduce((sum, day) => sum + day.completed, 0);
  const overallCompletion = percent(tasksCompleted, tasksTotal);

  let bestDay: DayProgress | null = null;
  let worstDay: DayProgress | null = null;
  for (const day of countable) {
    if (!bestDay || (day.rate ?? 0) > (bestDay.rate ?? 0) || ((day.rate ?? 0) === (bestDay.rate ?? 0) && day.completed > bestDay.completed)) {
      bestDay = day;
    }
    if (!worstDay || (day.rate ?? 1) < (worstDay.rate ?? 1)) {
      worstDay = day;
    }
  }

  return {
    monthLabel: new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
    year,
    monthIndex,
    overallCompletion,
    tasksCompleted,
    tasksTotal,
    bestDay: bestDay?.date ?? null,
    worstDay: worstDay?.date ?? null,
    bestStreak: streakFromDays(days, false).best,
    currentStreak: currentStreak(tasks, occurrences),
    days,
  };
}

function streakFromDays(days: DayProgress[], fromEnd: boolean): { current: number; best: number } {
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
  const earliest = tasks.reduce((min, task) => (task.date < min ? task.date : min), tasks[0].date);
  const days = eachDateKey(earliest, throughDate).map((date) =>
    dayProgress(tasks, occurrences, date),
  );
  return streakFromDays(days, true).current;
}

export function bestStreak(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  throughDate = todayKey(),
): number {
  if (tasks.length === 0) return 0;
  const earliest = tasks.reduce((min, task) => (task.date < min ? task.date : min), tasks[0].date);
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

  const earliest = tasks.reduce((min, task) => (task.date < min ? task.date : min), tasks[0].date);
  const dates = eachDateKey(earliest, throughDate);
  let total = 0;
  let completed = 0;
  let missed = 0;
  const weekdayTotals = Array.from({ length: 7 }, () => ({ completed: 0, total: 0 }));
  const categoryMap = new Map<string, { completed: number; total: number }>();

  for (const date of dates) {
    const resolved = resolveForDate(tasks, occurrences, date);
    const weekday = parseDateKey(date).getDay();
    const isPast = date < throughDate;
    for (const item of resolved) {
      total += 1;
      weekdayTotals[weekday].total += 1;
      const category = item.task.category ?? 'Other';
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
    if (rate > bestRate || (rate === bestRate && value.completed > bestCompleted)) {
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
    mostProductiveDay: bestDayIndex === null ? null : weekdayLabel(bestDayIndex, true),
    mostCompletedCategory: categoryRates[0]?.category ?? null,
    missedTasks: missed,
    categoryRates,
  };
}
