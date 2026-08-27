import {
  catchUpTimer,
  pauseTimer,
  remainingMs,
  resumeTimer,
  skipSection,
  startTimer,
} from '../services/timerEngine';
import type { TimerSection } from '../types/models';

const sections: TimerSection[] = [
  { id: '1', title: 'Warm Up', type: 'activity', durationSeconds: 45, order: 0 },
  { id: '2', title: 'Break', type: 'break', durationSeconds: 15, order: 1 },
  { id: '3', title: 'Work', type: 'activity', durationSeconds: 45, order: 2 },
];

describe('timer engine', () => {
  it('starts with timestamp-based remaining time', () => {
    const now = 1_000_000;
    const state = startTimer('s1', 'Morning', sections, now);
    expect(remainingMs(state, now)).toBe(45_000);
    expect(remainingMs(state, now + 10_000)).toBe(35_000);
  });

  it('pauses and resumes without drifting', () => {
    const started = startTimer('s1', 'Morning', sections, 0);
    const paused = pauseTimer(started, 10_000);
    expect(paused.status).toBe('paused');
    expect(paused.remainingMsWhenPaused).toBe(35_000);
    const resumed = resumeTimer(paused, 50_000);
    expect(resumed.sectionEndsAt).toBe(85_000);
  });

  it('skips to the next section', () => {
    const started = startTimer('s1', 'Morning', sections, 0);
    const skipped = skipSection(started, 5_000);
    expect(skipped.currentIndex).toBe(1);
    expect(skipped.sections[skipped.currentIndex].title).toBe('Break');
  });

  it('advances through sections after being backgrounded', () => {
    const started = startTimer('s1', 'Morning', sections, 0);
    const later = catchUpTimer(started, 50_000);
    expect(later.currentIndex).toBe(1);
    expect(later.status).toBe('running');
    const done = catchUpTimer(started, 120_000);
    expect(done.status).toBe('completed');
  });
});
