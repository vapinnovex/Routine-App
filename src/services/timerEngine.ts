import type { ActiveTimerState, TimerSection } from '@/types/models';

export function totalDurationSeconds(sections: TimerSection[]): number {
  return sections.reduce((sum, section) => sum + Math.max(0, section.durationSeconds), 0);
}

export function remainingMs(state: ActiveTimerState, now: number): number {
  if (state.status === 'paused') {
    return Math.max(0, state.remainingMsWhenPaused ?? 0);
  }
  if (state.status !== 'running' || !state.sectionEndsAt) {
    const section = state.sections[state.currentIndex];
    return (section?.durationSeconds ?? 0) * 1000;
  }
  return Math.max(0, state.sectionEndsAt - now);
}

/**
 * Advance through any sections whose end timestamps are already in the past.
 * Used after backgrounding, lock-screen, or app restart.
 */
export function catchUpTimer(state: ActiveTimerState, now: number): ActiveTimerState {
  if (state.status !== 'running' || !state.sectionEndsAt) return state;

  let currentIndex = state.currentIndex;
  let sectionEndsAt = state.sectionEndsAt;
  let completedSectionCount = state.completedSectionCount;

  while (now >= sectionEndsAt) {
    completedSectionCount = Math.max(completedSectionCount, currentIndex + 1);
    if (currentIndex >= state.sections.length - 1) {
      return {
        ...state,
        currentIndex,
        sectionEndsAt: null,
        remainingMsWhenPaused: 0,
        status: 'completed',
        completedSectionCount: state.sections.length,
      };
    }
    currentIndex += 1;
    const next = state.sections[currentIndex];
    sectionEndsAt += Math.max(1, next.durationSeconds) * 1000;
  }

  return {
    ...state,
    currentIndex,
    sectionEndsAt,
    completedSectionCount,
  };
}

export function startTimer(
  sessionId: string,
  sessionName: string,
  sections: TimerSection[],
  now: number,
): ActiveTimerState {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const first = ordered[0];
  return {
    sessionId,
    sessionName,
    sections: ordered,
    currentIndex: 0,
    status: 'running',
    sectionEndsAt: now + Math.max(1, first.durationSeconds) * 1000,
    remainingMsWhenPaused: null,
    startedAt: now,
    completedSectionCount: 0,
  };
}

export function pauseTimer(state: ActiveTimerState, now: number): ActiveTimerState {
  if (state.status !== 'running') return state;
  return {
    ...state,
    status: 'paused',
    remainingMsWhenPaused: remainingMs(state, now),
    sectionEndsAt: null,
  };
}

export function resumeTimer(state: ActiveTimerState, now: number): ActiveTimerState {
  if (state.status !== 'paused') return state;
  const remaining = Math.max(0, state.remainingMsWhenPaused ?? 0);
  if (remaining <= 0) {
    return skipSection({ ...state, status: 'running', remainingMsWhenPaused: 0 }, now);
  }
  return {
    ...state,
    status: 'running',
    sectionEndsAt: now + remaining,
    remainingMsWhenPaused: null,
  };
}

export function skipSection(state: ActiveTimerState, now: number): ActiveTimerState {
  if (state.status === 'completed') return state;
  const completedSectionCount = Math.max(state.completedSectionCount, state.currentIndex + 1);
  if (state.currentIndex >= state.sections.length - 1) {
    return {
      ...state,
      status: 'completed',
      sectionEndsAt: null,
      remainingMsWhenPaused: 0,
      completedSectionCount: state.sections.length,
    };
  }
  const nextIndex = state.currentIndex + 1;
  const next = state.sections[nextIndex];
  return {
    ...state,
    currentIndex: nextIndex,
    status: 'running',
    sectionEndsAt: now + Math.max(1, next.durationSeconds) * 1000,
    remainingMsWhenPaused: null,
    completedSectionCount,
  };
}

export function previousSection(state: ActiveTimerState, now: number): ActiveTimerState {
  if (state.currentIndex === 0) {
    const first = state.sections[0];
    return {
      ...state,
      status: 'running',
      sectionEndsAt: now + Math.max(1, first.durationSeconds) * 1000,
      remainingMsWhenPaused: null,
    };
  }
  const nextIndex = state.currentIndex - 1;
  const section = state.sections[nextIndex];
  return {
    ...state,
    currentIndex: nextIndex,
    status: 'running',
    sectionEndsAt: now + Math.max(1, section.durationSeconds) * 1000,
    remainingMsWhenPaused: null,
    completedSectionCount: Math.min(state.completedSectionCount, nextIndex),
  };
}

export function restartTimer(state: ActiveTimerState, now: number): ActiveTimerState {
  return startTimer(state.sessionId, state.sessionName, state.sections, now);
}

export function sectionProgress(state: ActiveTimerState, now: number): number {
  const section = state.sections[state.currentIndex];
  if (!section) return 0;
  const total = Math.max(1, section.durationSeconds) * 1000;
  return 1 - remainingMs(state, now) / total;
}

export function sessionProgress(state: ActiveTimerState, now: number): number {
  const total = totalDurationSeconds(state.sections) * 1000;
  if (total <= 0) return 0;
  const completed = state.sections
    .slice(0, state.currentIndex)
    .reduce((sum, section) => sum + section.durationSeconds * 1000, 0);
  const currentElapsed =
    Math.max(1, state.sections[state.currentIndex]?.durationSeconds ?? 0) * 1000 -
    remainingMs(state, now);
  return (completed + currentElapsed) / total;
}

export function upcomingNotifications(
  state: ActiveTimerState,
  now: number,
): Array<{ fireDate: Date; title: string; body: string }> {
  if (state.status !== 'running' || !state.sectionEndsAt) return [];
  const items: Array<{ fireDate: Date; title: string; body: string }> = [];
  let fireAt = state.sectionEndsAt;
  for (let index = state.currentIndex; index < state.sections.length; index += 1) {
    const current = state.sections[index];
    const next = state.sections[index + 1];
    const body = next
      ? `Next: ${next.title} · ${formatShortDuration(next.durationSeconds)}`
      : 'Session complete';
    items.push({
      fireDate: new Date(fireAt),
      title: `${current.title} complete`,
      body,
    });
    if (next) {
      fireAt += Math.max(1, next.durationSeconds) * 1000;
    }
  }
  return items.filter((item) => item.fireDate.getTime() > now + 400);
}

function formatShortDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${minutes} min ${rest} sec` : `${minutes} min`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}
