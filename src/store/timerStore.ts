import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
    cancelTimerNotifications,
    scheduleTaskNotifications,
    scheduleTimerNotifications,
} from "@/services/notifications";
import { createPersistStorage } from "@/services/persistStorage";
import { buildSampleSessions } from "@/services/sampleData";
import {
    catchUpTimer,
    pauseTimer,
    previousSection,
    restartTimer,
    resumeTimer,
    skipSection,
    startTimer,
} from "@/services/timerEngine";
import { useTaskStore } from "@/store/taskStore";
import { useUserStore } from "@/store/userStore";
import type {
    ActiveTimerState,
    TimerSection,
    TimerSession,
} from "@/types/models";
import { createId } from "@/utils/id";

interface SessionInput {
  name: string;
  category: string | null;
  sections: Array<Pick<TimerSection, "title" | "type" | "durationSeconds">>;
}

interface TimerState {
  hydrated: boolean;
  hasUserChanges: boolean;
  sessions: TimerSession[];
  active: ActiveTimerState | null;
  lastCompleted: ActiveTimerState | null;
  setHydrated: () => void;
  saveSession: (input: SessionInput, id?: string) => TimerSession;
  deleteSession: (id: string) => void;
  moveSession: (id: string, direction: -1 | 1) => void;
  reorderSessions: (ids: string[]) => void;
  duplicateSession: (id: string) => TimerSession | null;
  startSession: (id: string) => ActiveTimerState | null;
  startQuickTimer: (durationSeconds: number) => ActiveTimerState;
  tickCatchUp: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  previous: () => void;
  restart: () => void;
  end: () => void;
  clearLastCompleted: () => void;
  installSampleSessions: () => void;
  clearSessions: () => void;
}

function uniqueName(
  name: string,
  sessions: TimerSession[],
  ignoreId?: string,
): string {
  const existing = new Set(
    sessions
      .filter((session) => session.id !== ignoreId)
      .map((session) => session.name.toLowerCase()),
  );
  if (!existing.has(name.toLowerCase())) return name;
  let index = 2;
  while (existing.has(`${name} ${index}`.toLowerCase())) index += 1;
  return `${name} ${index}`;
}

function toSections(
  items: Array<Pick<TimerSection, "title" | "type" | "durationSeconds">>,
): TimerSection[] {
  return items.map((item, index) => ({
    id: createId(),
    title: item.title.trim() || `Section ${index + 1}`,
    type: item.type,
    durationSeconds: Math.max(1, Math.round(item.durationSeconds)),
    order: index,
  }));
}

async function syncNotifications(active: ActiveTimerState | null) {
  const preferences = useUserStore.getState().user?.preferences;
  await scheduleTimerNotifications(
    active,
    Boolean(
      preferences?.notificationsEnabled &&
      preferences.timerNotificationsEnabled,
    ),
  );
  await scheduleTaskNotifications(
    useTaskStore.getState().tasks,
    Boolean(
      preferences?.notificationsEnabled && preferences.taskRemindersEnabled,
    ),
  );
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      hasUserChanges: false,
      sessions: [],
      active: null,
      lastCompleted: null,
      setHydrated: () => set({ hydrated: true }),
      saveSession: (input, id) => {
        const now = new Date().toISOString();
        const sections = toSections(input.sections);
        if (id) {
          const current = get().sessions.find((session) => session.id === id);
          if (current) {
            const updated: TimerSession = {
              ...current,
              name: uniqueName(
                input.name.trim() || "Untitled session",
                get().sessions,
                id,
              ),
              category: input.category,
              sections,
              updatedAt: now,
            };
            set({
              sessions: get().sessions.map((session) =>
                session.id === id ? updated : session,
              ),
              hasUserChanges: true,
            });
            return updated;
          }
        }
        const created: TimerSession = {
          id: createId(),
          name: uniqueName(
            input.name.trim() || "Untitled session",
            get().sessions,
          ),
          category: input.category,
          createdAt: now,
          updatedAt: now,
          lastUsedAt: null,
          sections,
        };
        set({ sessions: [created, ...get().sessions], hasUserChanges: true });
        return created;
      },
      deleteSession: (id) => {
        set({
          sessions: get().sessions.filter((session) => session.id !== id),
          hasUserChanges: true,
        });
      },
      moveSession: (id, direction) => {
        set((state) => {
          const index = state.sessions.findIndex(
            (session) => session.id === id,
          );
          const target = index + direction;
          if (index < 0 || target < 0 || target >= state.sessions.length)
            return state;
          const sessions = [...state.sessions];
          [sessions[index], sessions[target]] = [
            sessions[target],
            sessions[index],
          ];
          return { sessions, hasUserChanges: true };
        });
      },
      reorderSessions: (ids) => {
        set((state) => {
          const byId = new Map(
            state.sessions.map((session) => [session.id, session]),
          );
          const ordered = ids
            .map((sessionId) => byId.get(sessionId))
            .filter((session): session is TimerSession => Boolean(session));
          const remaining = state.sessions.filter(
            (session) => !ids.includes(session.id),
          );
          return { sessions: [...ordered, ...remaining], hasUserChanges: true };
        });
      },
      duplicateSession: (id) => {
        const current = get().sessions.find((session) => session.id === id);
        if (!current) return null;
        return get().saveSession({
          name: `${current.name} copy`,
          category: current.category,
          sections: current.sections
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((section) => ({
              title: section.title,
              type: section.type,
              durationSeconds: section.durationSeconds,
            })),
        });
      },
      startSession: (id) => {
        const session = get().sessions.find((item) => item.id === id);
        if (!session || session.sections.length === 0) return null;
        const active = startTimer(
          session.id,
          session.name,
          session.sections,
          Date.now(),
        );
        set({
          active,
          lastCompleted: null,
          sessions: get().sessions.map((item) =>
            item.id === id
              ? { ...item, lastUsedAt: new Date().toISOString() }
              : item,
          ),
        });
        void syncNotifications(active);
        return active;
      },
      startQuickTimer: (durationSeconds) => {
        const sections: TimerSection[] = [
          {
            id: createId(),
            title: "Focus",
            type: "activity",
            durationSeconds: Math.max(1, Math.round(durationSeconds)),
            order: 0,
          },
        ];
        const active = startTimer(
          "quick-timer",
          "Quick Timer",
          sections,
          Date.now(),
        );
        set({ active, lastCompleted: null });
        void syncNotifications(active);
        return active;
      },
      tickCatchUp: () => {
        const active = get().active;
        if (!active) return;
        const next = catchUpTimer(active, Date.now());
        if (next.status === "completed") {
          set({ active: null, lastCompleted: next });
          void cancelTimerNotifications();
          return;
        }
        if (
          next.currentIndex !== active.currentIndex ||
          next.sectionEndsAt !== active.sectionEndsAt
        ) {
          set({ active: next });
        }
      },
      pause: () => {
        const active = get().active;
        if (!active) return;
        const next = pauseTimer(active, Date.now());
        set({ active: next });
        void syncNotifications(next);
      },
      resume: () => {
        const active = get().active;
        if (!active) return;
        const next = resumeTimer(active, Date.now());
        if (next.status === "completed") {
          set({ active: null, lastCompleted: next });
          void cancelTimerNotifications();
          return;
        }
        set({ active: next });
        void syncNotifications(next);
      },
      skip: () => {
        const active = get().active;
        if (!active) return;
        const next = skipSection(active, Date.now());
        if (next.status === "completed") {
          set({ active: null, lastCompleted: next });
          void cancelTimerNotifications();
          return;
        }
        set({ active: next });
        void syncNotifications(next);
      },
      previous: () => {
        const active = get().active;
        if (!active) return;
        const next = previousSection(active, Date.now());
        set({ active: next });
        void syncNotifications(next);
      },
      restart: () => {
        const active = get().active;
        if (!active) return;
        const next = restartTimer(active, Date.now());
        set({ active: next, lastCompleted: null });
        void syncNotifications(next);
      },
      end: () => {
        set({ active: null });
        void cancelTimerNotifications();
      },
      clearLastCompleted: () => set({ lastCompleted: null }),
      installSampleSessions: () => {
        set({
          sessions: [...buildSampleSessions(), ...get().sessions],
          hasUserChanges: false,
        });
      },
      clearSessions: () =>
        set({
          sessions: [],
          active: null,
          lastCompleted: null,
          hasUserChanges: false,
        }),
    }),
    {
      name: "routine-timer",
      storage:
        createPersistStorage<
          Pick<
            TimerState,
            "sessions" | "active" | "lastCompleted" | "hasUserChanges"
          >
        >(),
      partialize: (state) => ({
        sessions: state.sessions,
        active: state.active,
        lastCompleted: state.lastCompleted,
        hasUserChanges: state.hasUserChanges,
      }),
      onRehydrateStorage: () => (state) => {
        useTimerStore.setState({ hydrated: true });
        if (state?.active) {
          const next = catchUpTimer(state.active, Date.now());
          if (next.status === "completed") {
            useTimerStore.setState({ active: null, lastCompleted: next });
          } else {
            useTimerStore.setState({ active: next });
          }
        }
      },
    },
  ),
);
