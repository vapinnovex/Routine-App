export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserPreferences {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  taskRemindersEnabled: boolean;
  timerNotificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  onboardingComplete: boolean;
  sampleDataInstalled: boolean;
  preferences: UserPreferences;
}

export const CATEGORIES = [
  'Health',
  'Fitness',
  'Study',
  'Work',
  'Personal',
  'Reading',
  'Learning',
  'Other',
] as const;

export type TaskCategory = (typeof CATEGORIES)[number] | string;

export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'monthly'
  | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** 0 = Sunday … 6 = Saturday */
  weekdays?: number[];
  /** Every N days / weeks / months depending on frequency */
  interval?: number;
  endDate?: string | null;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  category: string | null;
  /** Anchor date YYYY-MM-DD */
  date: string;
  /** Optional HH:mm */
  time: string | null;
  recurrence: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  subtasks: Subtask[];
}

export type OccurrenceStatus = 'pending' | 'completed' | 'skipped';

export interface SubtaskCompletion {
  completed: boolean;
  completedAt: string | null;
}

export interface TaskOccurrence {
  id: string;
  taskId: string;
  date: string;
  status: OccurrenceStatus;
  completedAt: string | null;
  /** Per-occurrence subtask state keyed by subtask id */
  subtaskCompletions: Record<string, SubtaskCompletion>;
  parentManuallyCompleted: boolean;
}

export type TimerSectionType = 'activity' | 'break';

export interface TimerSection {
  id: string;
  title: string;
  type: TimerSectionType;
  durationSeconds: number;
  order: number;
}

export interface TimerSession {
  id: string;
  name: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  sections: TimerSection[];
}

export type ActiveTimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface ActiveTimerState {
  sessionId: string;
  sessionName: string;
  sections: TimerSection[];
  currentIndex: number;
  status: ActiveTimerStatus;
  /** Epoch ms when the current section should end (running only) */
  sectionEndsAt: number | null;
  remainingMsWhenPaused: number | null;
  startedAt: number;
  completedSectionCount: number;
}

export interface PersistedAppData {
  user: UserProfile | null;
  tasks: Task[];
  occurrences: Record<string, TaskOccurrence>;
  sessions: TimerSession[];
  activeTimer: ActiveTimerState | null;
}

export const defaultPreferences = (): UserPreferences => ({
  theme: 'system',
  notificationsEnabled: true,
  taskRemindersEnabled: true,
  timerNotificationsEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
});
