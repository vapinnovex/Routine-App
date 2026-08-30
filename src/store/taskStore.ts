import { create } from "zustand";
import { persist } from "zustand/middleware";

import { scheduleTaskNotifications } from "@/services/notifications";
import {
    applyParentToggle,
    applySubtaskToggle,
    emptyOccurrence,
    resolveForDate,
    resolveOccurrence,
} from "@/services/occurrences";
import { createPersistStorage } from "@/services/persistStorage";
import { buildSampleTasks } from "@/services/sampleData";
import { useUserStore } from "@/store/userStore";
import type { RecurrenceRule, Task, TaskOccurrence } from "@/types/models";
import { todayKey } from "@/utils/dates";
import { createId, occurrenceId } from "@/utils/id";

interface TaskInput {
  title: string;
  category: string | null;
  date: string;
  time: string | null;
  recurrence: RecurrenceRule;
  subtasks: string[];
}

interface TaskState {
  hydrated: boolean;
  hasUserChanges: boolean;
  tasks: Task[];
  occurrences: Record<string, TaskOccurrence>;
  error: string | null;
  setHydrated: () => void;
  createTask: (input: TaskInput) => Task;
  updateTask: (
    id: string,
    input: Partial<TaskInput> & { title?: string },
  ) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, direction: -1 | 1) => void;
  reorderTasks: (ids: string[]) => void;
  toggleTaskComplete: (taskId: string, date: string) => void;
  toggleSubtask: (taskId: string, date: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  installSampleTasks: () => void;
  clearTasks: () => void;
}

function upsertOccurrence(
  occurrences: Record<string, TaskOccurrence>,
  next: TaskOccurrence,
): Record<string, TaskOccurrence> {
  return { ...occurrences, [next.id]: next };
}

function syncTaskNotifications(tasks: Task[]) {
  const preferences = useUserStore.getState().user?.preferences;
  void scheduleTaskNotifications(
    tasks,
    Boolean(
      preferences?.notificationsEnabled && preferences.taskRemindersEnabled,
    ),
  );
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      hasUserChanges: false,
      tasks: [],
      occurrences: {},
      error: null,
      setHydrated: () => set({ hydrated: true }),
      createTask: (input) => {
        const now = new Date().toISOString();
        const task: Task = {
          id: createId(),
          title: input.title.trim(),
          category: input.category,
          date: input.date,
          time: input.time,
          recurrence: input.recurrence,
          createdAt: now,
          updatedAt: now,
          archived: false,
          subtasks: input.subtasks
            .map((title) => title.trim())
            .filter(Boolean)
            .map((title) => ({
              id: createId(),
              title,
              completed: false,
              completedAt: null,
            })),
        };
        set({ tasks: [task, ...get().tasks], hasUserChanges: true });
        syncTaskNotifications([task, ...get().tasks]);
        return task;
      },
      updateTask: (id, input) => {
        const tasks = get().tasks.map((task) => {
          if (task.id !== id) return task;
          const subtasks =
            input.subtasks !== undefined
              ? input.subtasks
                  .map((title) => title.trim())
                  .filter(Boolean)
                  .map((title, index) => {
                    const existing = task.subtasks[index];
                    return {
                      id: existing?.id ?? createId(),
                      title,
                      completed: existing?.completed ?? false,
                      completedAt: existing?.completedAt ?? null,
                    };
                  })
              : task.subtasks;
          return {
            ...task,
            title: input.title?.trim() ?? task.title,
            category:
              input.category === undefined ? task.category : input.category,
            date: input.date ?? task.date,
            time: input.time === undefined ? task.time : input.time,
            recurrence: input.recurrence ?? task.recurrence,
            subtasks,
            updatedAt: new Date().toISOString(),
          };
        });
        set({
          tasks,
          hasUserChanges: true,
        });
        syncTaskNotifications(tasks);
      },
      deleteTask: (id) => {
        const occurrences = { ...get().occurrences };
        for (const key of Object.keys(occurrences)) {
          if (occurrences[key].taskId === id) delete occurrences[key];
        }
        const tasks = get().tasks.filter((task) => task.id !== id);
        set({
          tasks,
          occurrences,
          hasUserChanges: true,
        });
        syncTaskNotifications(tasks);
      },
      moveTask: (id, direction) => {
        set((state) => {
          const index = state.tasks.findIndex((task) => task.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= state.tasks.length)
            return state;
          const tasks = [...state.tasks];
          [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
          return { tasks, hasUserChanges: true };
        });
      },
      reorderTasks: (ids) => {
        set((state) => {
          const byId = new Map(state.tasks.map((task) => [task.id, task]));
          const ordered = ids
            .map((taskId) => byId.get(taskId))
            .filter((task): task is Task => Boolean(task));
          const remaining = state.tasks.filter(
            (task) => !ids.includes(task.id),
          );
          return { tasks: [...ordered, ...remaining], hasUserChanges: true };
        });
      },
      toggleTaskComplete: (taskId, date) => {
        if (date > todayKey()) return;
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;
        const id = occurrenceId(taskId, date);
        const current = get().occurrences[id] ?? emptyOccurrence(task, date);
        const resolved = resolveOccurrence(task, date, current);
        const next = applyParentToggle(
          task,
          current,
          !resolved.isComplete,
          new Date().toISOString(),
        );
        set({
          occurrences: upsertOccurrence(get().occurrences, next),
          hasUserChanges: true,
        });
      },
      toggleSubtask: (taskId, date, subtaskId) => {
        if (date > todayKey()) return;
        const task = get().tasks.find((item) => item.id === taskId);
        if (!task) return;
        const id = occurrenceId(taskId, date);
        const current = get().occurrences[id] ?? emptyOccurrence(task, date);
        const resolved = resolveOccurrence(task, date, current);
        const subtask = resolved.subtasks.find((item) => item.id === subtaskId);
        if (!subtask) return;
        const next = applySubtaskToggle(
          task,
          current,
          subtaskId,
          !subtask.completed,
          new Date().toISOString(),
        );
        set({
          occurrences: upsertOccurrence(get().occurrences, next),
          hasUserChanges: true,
        });
      },
      addSubtask: (taskId, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set({
          tasks: get().tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updatedAt: new Date().toISOString(),
                  subtasks: [
                    ...task.subtasks,
                    {
                      id: createId(),
                      title: trimmed,
                      completed: false,
                      completedAt: null,
                    },
                  ],
                }
              : task,
          ),
          hasUserChanges: true,
        });
      },
      updateSubtask: (taskId, subtaskId, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set({
          tasks: get().tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updatedAt: new Date().toISOString(),
                  subtasks: task.subtasks.map((subtask) =>
                    subtask.id === subtaskId
                      ? { ...subtask, title: trimmed }
                      : subtask,
                  ),
                }
              : task,
          ),
          hasUserChanges: true,
        });
      },
      deleteSubtask: (taskId, subtaskId) => {
        set({
          tasks: get().tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updatedAt: new Date().toISOString(),
                  subtasks: task.subtasks.filter(
                    (subtask) => subtask.id !== subtaskId,
                  ),
                }
              : task,
          ),
          hasUserChanges: true,
        });
      },
      installSampleTasks: () => {
        set({
          tasks: [...buildSampleTasks(), ...get().tasks],
          hasUserChanges: false,
        });
      },
      clearTasks: () =>
        set({ tasks: [], occurrences: {}, hasUserChanges: false }),
    }),
    {
      name: "routine-tasks",
      storage:
        createPersistStorage<
          Pick<TaskState, "tasks" | "occurrences" | "hasUserChanges">
        >(),
      partialize: (state) => ({
        tasks: state.tasks,
        occurrences: state.occurrences,
        hasUserChanges: state.hasUserChanges,
      }),
      onRehydrateStorage: () => () => {
        useTaskStore.setState({ hydrated: true });
      },
    },
  ),
);

export function useTodayProgress() {
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const items = resolveForDate(tasks, occurrences, todayKey());
  const completed = items.filter((item) => item.isComplete).length;
  return { items, completed, total: items.length };
}
