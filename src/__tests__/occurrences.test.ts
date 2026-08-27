import {
  applyParentToggle,
  applySubtaskToggle,
  emptyOccurrence,
  resolveOccurrence,
} from '../services/occurrences';
import type { Task } from '../types/models';

const task: Task = {
  id: 'workout',
  title: 'Morning Workout',
  category: 'Fitness',
  date: '2026-08-18',
  time: '07:00',
  recurrence: { frequency: 'none' },
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  archived: false,
  subtasks: [
    { id: 's1', title: 'Warm up', completed: false, completedAt: null },
    { id: 's2', title: 'Run', completed: false, completedAt: null },
  ],
};

describe('task completion', () => {
  it('completes the parent when every subtask is done', () => {
    let occurrence = emptyOccurrence(task, '2026-08-18');
    occurrence = applySubtaskToggle(task, occurrence, 's1', true, 't1');
    expect(resolveOccurrence(task, '2026-08-18', occurrence).isComplete).toBe(false);
    occurrence = applySubtaskToggle(task, occurrence, 's2', true, 't2');
    expect(resolveOccurrence(task, '2026-08-18', occurrence).isComplete).toBe(true);
  });

  it('does not force subtasks complete when the parent is marked done', () => {
    const occurrence = applyParentToggle(task, emptyOccurrence(task, '2026-08-18'), true, 't1');
    const resolved = resolveOccurrence(task, '2026-08-18', occurrence);
    expect(resolved.isComplete).toBe(true);
    expect(resolved.subtasks.every((item) => item.completed)).toBe(false);
  });

  it('uncompleting the parent leaves subtask state intact', () => {
    let occurrence = emptyOccurrence(task, '2026-08-18');
    occurrence = applySubtaskToggle(task, occurrence, 's1', true, 't1');
    occurrence = applyParentToggle(task, occurrence, true, 't2');
    occurrence = applyParentToggle(task, occurrence, false, 't3');
    const resolved = resolveOccurrence(task, '2026-08-18', occurrence);
    expect(resolved.isComplete).toBe(false);
    expect(resolved.subtasks[0].completed).toBe(true);
  });
});
