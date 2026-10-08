jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('@/services/notifications', () => ({
  scheduleTaskNotifications: jest.fn().mockResolvedValue(undefined),
  scheduleTimerNotifications: jest.fn().mockResolvedValue(undefined),
  cancelTimerNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/sessionStorage', () => ({
  readSession: jest.fn().mockResolvedValue(null), saveSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/api', () => ({
  api: jest.fn(), setAccessToken: jest.fn(),
  ApiError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));

import { api, ApiError } from '@/services/api';
import { initializeAccount, flushChanges, reloadAccount, signIn, signOut, returnToSignIn } from '@/services/accountSync';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import { useUserStore } from '@/store/userStore';
import { useConnectionStore } from '@/store/connectionStore';
import { defaultPreferences } from '@/types/models';

const mockApi = api as jest.Mock;
const profile = { name: 'Tester', onboardingComplete: true, sampleDataInstalled: false, preferences: defaultPreferences() };
const user = { ...profile, id: 'user-1', email: 'tester@example.com', createdAt: '2026-09-12T00:00:00Z' };
let server: any;
let failWrite: number | null;
let writes: any[];

beforeEach(async () => {
  server = { revision: 0, data: { profile, tasks: [], occurrences: {}, sessions: [], activeTimer: null,
    lastCompletedTimer: null, history: [], taskChanges: false, sessionChanges: false } };
  writes = [];
  failWrite = null;
  mockApi.mockImplementation(async (path, options) => {
    if (path === '/users/me') return user;
    if (path === '/auth/logout') return undefined;
    if (options?.method === 'PUT') {
      const body = JSON.parse(options.body);
      writes.push(body);
      if (failWrite !== null) throw new ApiError(failWrite, 'Save failed');
      server = { revision: body.revision + 1, data: body.data };
    }
    return JSON.parse(JSON.stringify(server));
  });
  await initializeAccount();
});

afterEach(async () => {
  failWrite = null;
  await returnToSignIn();
});

function createTask() {
  return useTaskStore.getState().createTask({ title: 'Walk', category: null, date: '2026-09-12', time: null,
    recurrence: { frequency: 'daily' }, subtasks: [] });
}

test('hydrates from the backend and saves tasks, preferences and timer history', async () => {
  expect(useUserStore.getState().user?.email).toBe(user.email);
  createTask();
  useUserStore.getState().updatePreferences({ theme: 'dark' });
  const active = useTimerStore.getState().startQuickTimer(60);
  useTimerStore.getState().finishCompletedTimer({ ...active, status: 'completed', completedSectionCount: 1 });
  await flushChanges();
  expect(server.data.tasks).toHaveLength(1);
  expect(server.data.profile.preferences.theme).toBe('dark');
  expect(server.data.history).toHaveLength(1);
  expect(server.data.activeTimer).toBeNull();
  expect(useConnectionStore.getState().saving).toBe(false);
});

test('retains a failed mutation for exact retry and surfaces the failure', async () => {
  failWrite = 0;
  createTask();
  await expect(flushChanges()).rejects.toThrow('Save failed');
  const first = writes[0];
  expect(useConnectionStore.getState().error).toBe('Save failed');
  expect(useTaskStore.getState().tasks).toHaveLength(1);
  failWrite = null;
  await flushChanges();
  expect(writes[writes.length - 1]).toEqual(first);
  expect(useConnectionStore.getState().error).toBeNull();
});

test('does not overwrite a conflict and can reload server data', async () => {
  failWrite = 409;
  createTask();
  await expect(flushChanges()).rejects.toThrow();
  expect(useConnectionStore.getState().conflict).toBe(true);
  failWrite = null;
  await reloadAccount();
  expect(useTaskStore.getState().tasks).toEqual([]);
  expect(useConnectionStore.getState().conflict).toBe(false);
});

test('recovers an overdue active timer into history and saves completion', async () => {
  const active = useTimerStore.getState().startQuickTimer(1);
  await flushChanges();
  server.data.activeTimer = { ...active, startedAt: Date.now() - 5000, sectionEndsAt: Date.now() - 1000 };
  await reloadAccount();
  await flushChanges();
  expect(server.data.activeTimer).toBeNull();
  expect(server.data.history).toHaveLength(1);
});

test('logout waits for saved changes then clears account data from memory', async () => {
  createTask();
  await signOut();
  expect(server.data.tasks).toHaveLength(1);
  expect(useUserStore.getState().user).toBeNull();
  expect(useTaskStore.getState().tasks).toEqual([]);
  expect(useTimerStore.getState().history).toEqual([]);
});

test('cannot replace an authenticated account while it may have pending saves', async () => {
  await expect(signIn('login', 'other@example.com', 'password')).rejects.toThrow('Log out');
  expect(useUserStore.getState().user?.id).toBe('user-1');
});

test('returning to login revokes a live session before clearing local state', async () => {
  await returnToSignIn();
  expect(mockApi).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
  expect(useUserStore.getState().user).toBeNull();
});

test('refresh cannot discard edits made while its response is in flight', async () => {
  const implementation = mockApi.getMockImplementation()!;
  let release!: (value: unknown) => void;
  const stale = JSON.parse(JSON.stringify(server));
  mockApi.mockImplementation((path, options) => {
    if (path === '/users/me/data' && !options?.method) {
      return new Promise((resolve) => { release = resolve; });
    }
    return implementation(path, options);
  });
  const refreshing = reloadAccount();
  await Promise.resolve();
  createTask();
  release(stale);
  await expect(refreshing).rejects.toThrow('Changes were made while refreshing');
  await flushChanges();
  expect(useTaskStore.getState().tasks).toHaveLength(1);
});

test('reordering and removing subtasks preserves completion identity', async () => {
  const task = useTaskStore.getState().createTask({ title: 'Steps', category: null, date: '2026-09-12', time: null, recurrence: { frequency: 'daily' }, subtasks: ['A', 'B'] });
  useTaskStore.getState().toggleSubtask(task.id, task.date, task.subtasks[1].id);
  useTaskStore.getState().updateTask(task.id, { subtasks: ['B', 'A'] });
  expect(useTaskStore.getState().tasks[0].subtasks[0].id).toBe(task.subtasks[1].id);
  useTaskStore.getState().updateTask(task.id, { subtasks: ['B'] });
  expect(useTaskStore.getState().tasks[0].subtasks[0].id).toBe(task.subtasks[1].id);
  await flushChanges();
  expect(server.data.occurrences[`${task.id}:${task.date}`].subtaskCompletions[task.subtasks[1].id].completed).toBe(true);
});

test('does not silently replace an active timer and can repeat a quick timer', async () => {
  const first = useTimerStore.getState().startQuickTimer(60);
  expect(useTimerStore.getState().startQuickTimer(300)).toEqual(first);
  const done = { ...first, status: 'completed' as const, completedSectionCount: 1 };
  useTimerStore.getState().finishCompletedTimer(done);
  useTimerStore.getState().finishCompletedTimer(done);
  expect(useTimerStore.getState().history).toHaveLength(1);
  const repeated = useTimerStore.getState().repeatLast();
  expect(repeated?.sections[0].durationSeconds).toBe(60);
  expect(repeated?.status).toBe('running');
  await flushChanges();
});
