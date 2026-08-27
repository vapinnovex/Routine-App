import { bestStreak, currentStreak, monthStats } from '../services/stats';
import type { Task, TaskOccurrence } from '../types/models';

function task(id: string, date: string): Task {
  return {
    id,
    title: id,
    category: 'Work',
    date,
    time: null,
    recurrence: { frequency: 'none' },
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
    status: 'completed',
    completedAt: `${date}T12:00:00.000Z`,
    subtaskCompletions: {},
    parentManuallyCompleted: true,
  };
}

describe('monthly calculations', () => {
  it('ignores empty days when averaging completion', () => {
    const tasks = [task('a', '2026-08-01'), task('b', '2026-08-02')];
    const occurrences = {
      'a:2026-08-01': completed('a', '2026-08-01'),
    };
    const stats = monthStats(tasks, occurrences, 2026, 7);
    expect(stats.tasksTotal).toBe(2);
    expect(stats.tasksCompleted).toBe(1);
    expect(stats.overallCompletion).toBe(50);
    expect(stats.days.find((day) => day.date === '2026-08-03')?.rate).toBeNull();
  });

  it('counts a streak only when at least one task is completed', () => {
    const tasks = [task('a', '2026-08-01'), task('b', '2026-08-02'), task('c', '2026-08-03')];
    const occurrences = {
      'a:2026-08-01': completed('a', '2026-08-01'),
      'b:2026-08-02': completed('b', '2026-08-02'),
    };
    expect(currentStreak(tasks, occurrences, '2026-08-03')).toBe(0);
    expect(bestStreak(tasks, occurrences, '2026-08-03')).toBe(2);
  });

  it('does not break a streak on days with no scheduled tasks', () => {
    const tasks = [task('a', '2026-08-01'), task('c', '2026-08-03')];
    const occurrences = {
      'a:2026-08-01': completed('a', '2026-08-01'),
      'c:2026-08-03': completed('c', '2026-08-03'),
    };
    expect(currentStreak(tasks, occurrences, '2026-08-03')).toBe(2);
  });
});
