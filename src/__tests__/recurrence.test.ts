import { occursOnDate } from '../services/recurrence';
import type { Task } from '../types/models';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Test',
    category: 'Work',
    date: '2026-08-17',
    time: null,
    recurrence: { frequency: 'none' },
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    archived: false,
    subtasks: [],
    ...overrides,
  };
}

describe('recurrence', () => {
  it('only occurs on the anchor date when it does not repeat', () => {
    const task = makeTask();
    expect(occursOnDate(task, '2026-08-17')).toBe(true);
    expect(occursOnDate(task, '2026-08-18')).toBe(false);
  });

  it('repeats every day from the start date', () => {
    const task = makeTask({ recurrence: { frequency: 'daily' } });
    expect(occursOnDate(task, '2026-08-16')).toBe(false);
    expect(occursOnDate(task, '2026-08-17')).toBe(true);
    expect(occursOnDate(task, '2026-08-20')).toBe(true);
  });

  it('matches selected weekdays', () => {
    const task = makeTask({
      date: '2026-08-17',
      recurrence: { frequency: 'weekdays', weekdays: [1, 3, 5] },
    });
    expect(occursOnDate(task, '2026-08-17')).toBe(true);
    expect(occursOnDate(task, '2026-08-18')).toBe(false);
    expect(occursOnDate(task, '2026-08-19')).toBe(true);
  });

  it('repeats weekly on the same weekday', () => {
    const task = makeTask({
      date: '2026-08-17',
      recurrence: { frequency: 'weekly' },
    });
    expect(occursOnDate(task, '2026-08-24')).toBe(true);
    expect(occursOnDate(task, '2026-08-18')).toBe(false);
  });

  it('repeats monthly on the same day of month', () => {
    const task = makeTask({
      date: '2026-01-31',
      recurrence: { frequency: 'monthly' },
    });
    expect(occursOnDate(task, '2026-02-28')).toBe(true);
    expect(occursOnDate(task, '2026-03-31')).toBe(true);
    expect(occursOnDate(task, '2026-03-30')).toBe(false);
  });

  it('supports custom day intervals', () => {
    const task = makeTask({
      date: '2026-08-17',
      recurrence: { frequency: 'custom', interval: 3 },
    });
    expect(occursOnDate(task, '2026-08-20')).toBe(true);
    expect(occursOnDate(task, '2026-08-21')).toBe(false);
  });
});
