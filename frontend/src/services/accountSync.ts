import { Platform } from "react-native";

import { api, ApiError, setAccessToken } from "@/services/api";
import { readSession, saveSession } from "@/services/sessionStorage";
import { scheduleTaskNotifications, cancelTimerNotifications } from "@/services/notifications";
import { useConnectionStore } from "@/store/connectionStore";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useUserStore } from "@/store/userStore";
import type { ActiveTimerState, Task, TaskOccurrence, TimerHistoryEntry, TimerSession, UserProfile } from "@/types/models";
import { createId } from "@/utils/id";

export interface AccountData {
  schemaVersion?: 1;
  profile: Pick<UserProfile, "name" | "onboardingComplete" | "sampleDataInstalled" | "preferences">;
  tasks: Task[];
  occurrences: Record<string, TaskOccurrence>;
  sessions: TimerSession[];
  activeTimer: ActiveTimerState | null;
  lastCompletedTimer: ActiveTimerState | null;
  history: TimerHistoryEntry[];
  taskChanges: boolean;
  sessionChanges: boolean;
}
interface Envelope { revision: number; data: AccountData }
interface Write extends Envelope { mutationId: string }

let revision = 0;
let baseline = "";
let applying = false;
let pending: Write | null = null;
let inFlight: Promise<void> | null = null;
let initialized = false;
let bootstrap: Promise<void> | null = null;
let epoch = 0;

export function accountSnapshot(): AccountData {
  const user = useUserStore.getState().user;
  if (!user) throw new Error("Sign in to continue");
  const tasks = useTaskStore.getState();
  const timer = useTimerStore.getState();
  return {
    schemaVersion: 1,
    profile: { name: user.name, onboardingComplete: user.onboardingComplete,
      sampleDataInstalled: user.sampleDataInstalled, preferences: user.preferences },
    tasks: tasks.tasks, occurrences: tasks.occurrences, sessions: timer.sessions,
    activeTimer: timer.active, lastCompletedTimer: timer.lastCompleted, history: timer.history,
    taskChanges: tasks.hasUserChanges, sessionChanges: timer.hasUserChanges,
  };
}

function applyData(envelope: Envelope, user: UserProfile) {
  applying = true;
  revision = envelope.revision;
  const data = envelope.data;
  useUserStore.setState({ hydrated: true, user: { ...user, ...data.profile } });
  useTaskStore.setState({ hydrated: true, tasks: data.tasks, occurrences: data.occurrences, hasUserChanges: data.taskChanges });
  useTimerStore.setState({ hydrated: true, sessions: data.sessions, active: data.activeTimer,
    lastCompleted: data.lastCompletedTimer, history: data.history, hasUserChanges: data.sessionChanges });
  baseline = JSON.stringify(accountSnapshot());
  pending = null;
  applying = false;
  useConnectionStore.setState({ ready: true, error: null, conflict: false });
  // Recover overdue runs through the completion path, including history/task updates.
  useTimerStore.getState().tickCatchUp();
}

function clearMemory() {
  epoch += 1;
  applying = true;
  useUserStore.setState({ hydrated: true, user: null });
  useTaskStore.setState({ hydrated: true, tasks: [], occurrences: {}, hasUserChanges: false });
  useTimerStore.setState({ hydrated: true, sessions: [], active: null, lastCompleted: null, history: [], hasUserChanges: false });
  baseline = "";
  pending = null;
  applying = false;
  useConnectionStore.setState({ ready: true, saving: false, error: null, conflict: false });
  void cancelTimerNotifications();
  void scheduleTaskNotifications([], false);
}

function reportError(error: unknown) {
  useConnectionStore.setState({ saving: false,
    error: error instanceof Error ? error.message : "Could not save your changes.",
    conflict: error instanceof ApiError && error.status === 409 });
}

function changed() {
  if (applying || !useUserStore.getState().user || useConnectionStore.getState().error) return;
  useConnectionStore.setState({ saving: true });
  // Coalesce linked updates within one action into a single atomic API write.
  void Promise.resolve().then(() => {
    if (!useConnectionStore.getState().error) return flushChanges();
  }).catch(() => {}); // flushChanges already exposes errors in the connection panel.
}

export async function flushChanges(): Promise<void> {
  if (inFlight) { await inFlight; return flushChanges(); }
  if (!useUserStore.getState().user) return;
  const currentEpoch = epoch;
  const work = async () => {
    while (currentEpoch === epoch && useUserStore.getState().user) {
      const snapshot = JSON.stringify(accountSnapshot());
      if (!pending && snapshot === baseline) break;
      pending ??= { revision, data: JSON.parse(snapshot) as AccountData, mutationId: createId() };
      const sent = pending;
      useConnectionStore.setState({ saving: true });
      const result = await api<Envelope>("/users/me/data", { method: "PUT", body: JSON.stringify(sent) });
      if (currentEpoch !== epoch) return;
      revision = result.revision;
      baseline = JSON.stringify(sent.data);
      pending = null;
    }
    useConnectionStore.setState({ saving: false, error: null, conflict: false });
  };
  inFlight = work();
  try { await inFlight; }
  catch (error) {
    if (currentEpoch !== epoch) return;
    reportError(error); throw error;
  }
  finally { inFlight = null; }
}

export async function reloadAccount(): Promise<void> {
  if (inFlight) await inFlight.catch(() => {});
  const currentEpoch = epoch;
  const before = useUserStore.getState().user ? JSON.stringify(accountSnapshot()) : null;
  const user = await api<UserProfile>("/users/me");
  const data = await api<Envelope>("/users/me/data");
  if (currentEpoch !== epoch) return;
  const after = useUserStore.getState().user ? JSON.stringify(accountSnapshot()) : null;
  if (before !== after || (before !== null && data.revision < revision)) {
    throw new ApiError(409, "Changes were made while refreshing. Save them and refresh again.");
  }
  applyData(data, user);
}

export function initializeAccount(): Promise<void> {
  if (!initialized) {
    initialized = true;
    useUserStore.subscribe(changed);
    useTaskStore.subscribe(changed);
    useTimerStore.subscribe(changed);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("beforeunload", (event) => {
        if (useConnectionStore.getState().saving || useConnectionStore.getState().error) {
          event.preventDefault(); event.returnValue = "";
        }
      });
    }
  }
  bootstrap ??= (async () => {
    try {
      setAccessToken(await readSession());
      await reloadAccount();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await saveSession(null); setAccessToken(null); clearMemory();
      } else { reportError(error); }
    } finally { bootstrap = null; }
  })();
  return bootstrap;
}

export async function signIn(mode: "login" | "register", email: string, password: string, name?: string) {
  if (useUserStore.getState().user) throw new Error("Log out before signing into another account.");
  const result = await api<{ accessToken: string; user: UserProfile }>(`/auth/${mode}`, {
    method: "POST", body: JSON.stringify({ email: email.trim(), password, ...(mode === "register" ? { name: name?.trim() } : {}) }),
  });
  if (Platform.OS !== "web") setAccessToken(result.accessToken);
  await saveSession(result.accessToken);
  try {
    const data = await api<Envelope>("/users/me/data");
    epoch += 1;
    applyData(data, result.user);
  } catch (error) {
    useConnectionStore.setState({ ready: false });
    reportError(error);
    throw error;
  }
}

export async function signOut() {
  await flushChanges();
  await api<void>("/auth/logout", { method: "POST" });
  await saveSession(null); setAccessToken(null); clearMemory();
}

// Explicit recovery after an expired session; caller confirms discarding unsaved edits.
export async function returnToSignIn() {
  if (inFlight) await inFlight.catch(() => {});
  try { await api<void>("/auth/logout", { method: "POST" }); }
  catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  await saveSession(null); setAccessToken(null); clearMemory();
}

export async function clearAccountData() {
  await flushChanges();
  const data = await api<Envelope>("/users/me/data", { method: "DELETE", headers: { "If-Match": String(revision) } });
  applyData(data, useUserStore.getState().user!);
  await cancelTimerNotifications();
  await scheduleTaskNotifications([], false);
}

export async function exportAccountData() {
  await flushChanges();
  const data = await api<Envelope>("/users/me/data");
  return { exportedAt: new Date().toISOString(), user: await api<UserProfile>("/users/me"), ...data };
}
