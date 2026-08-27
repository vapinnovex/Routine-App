import type { Subtask, Task, TaskOccurrence } from '@/types/models';
import { occursOnDate } from '@/services/recurrence';
import { occurrenceId } from '@/utils/id';

export interface ResolvedOccurrence {
  occurrence: TaskOccurrence;
  task: Task;
  subtasks: Array<Subtask & { completed: boolean; completedAt: string | null }>;
  completedCount: number;
  totalSubtasks: number;
  isComplete: boolean;
}

export function emptyOccurrence(task: Task, date: string): TaskOccurrence {
  return {
    id: occurrenceId(task.id, date),
    taskId: task.id,
    date,
    status: 'pending',
    completedAt: null,
    subtaskCompletions: {},
    parentManuallyCompleted: false,
  };
}

export function resolveSubtasks(task: Task, occurrence: TaskOccurrence) {
  return task.subtasks.map((subtask) => {
    const override = occurrence.subtaskCompletions[subtask.id];
    return {
      ...subtask,
      completed: override?.completed ?? false,
      completedAt: override?.completedAt ?? null,
    };
  });
}

export function isOccurrenceComplete(task: Task, occurrence: TaskOccurrence): boolean {
  if (occurrence.status === 'completed' || occurrence.parentManuallyCompleted) {
    return true;
  }
  const subtasks = resolveSubtasks(task, occurrence);
  return subtasks.length > 0 && subtasks.every((item) => item.completed);
}

export function resolveOccurrence(
  task: Task,
  date: string,
  stored?: TaskOccurrence,
): ResolvedOccurrence {
  const occurrence = stored ?? emptyOccurrence(task, date);
  const subtasks = resolveSubtasks(task, occurrence);
  const completedCount = subtasks.filter((item) => item.completed).length;
  const autoComplete = subtasks.length > 0 && completedCount === subtasks.length;
  const isComplete =
    occurrence.parentManuallyCompleted || occurrence.status === 'completed' || autoComplete;

  return {
    occurrence,
    task,
    subtasks,
    completedCount,
    totalSubtasks: subtasks.length,
    isComplete,
  };
}

export function scheduledTasksForDate(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((task) => !task.archived && occursOnDate(task, date))
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

export function resolveForDate(
  tasks: Task[],
  occurrences: Record<string, TaskOccurrence>,
  date: string,
): ResolvedOccurrence[] {
  return scheduledTasksForDate(tasks, date).map((task) =>
    resolveOccurrence(task, date, occurrences[occurrenceId(task.id, date)]),
  );
}

export function applyParentToggle(
  task: Task,
  occurrence: TaskOccurrence,
  complete: boolean,
  completedAt: string,
): TaskOccurrence {
  if (complete) {
    return {
      ...occurrence,
      status: 'completed',
      completedAt,
      parentManuallyCompleted: true,
    };
  }
  return {
    ...occurrence,
    status: 'pending',
    completedAt: null,
    parentManuallyCompleted: false,
  };
}

export function applySubtaskToggle(
  task: Task,
  occurrence: TaskOccurrence,
  subtaskId: string,
  complete: boolean,
  completedAt: string,
): TaskOccurrence {
  const nextCompletions = {
    ...occurrence.subtaskCompletions,
    [subtaskId]: {
      completed: complete,
      completedAt: complete ? completedAt : null,
    },
  };
  const next: TaskOccurrence = {
    ...occurrence,
    subtaskCompletions: nextCompletions,
  };
  const resolved = resolveSubtasks(task, next);
  const allDone = resolved.length > 0 && resolved.every((item) => item.completed);

  if (allDone) {
    return {
      ...next,
      status: 'completed',
      completedAt,
      parentManuallyCompleted: false,
    };
  }

  if (!occurrence.parentManuallyCompleted) {
    return {
      ...next,
      status: 'pending',
      completedAt: null,
    };
  }

  return next;
}
