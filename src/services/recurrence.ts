import type { RecurrenceRule, Task } from '@/types/models';
import { addDays, parseDateKey, toDateKey } from '@/utils/dates';

function daysBetween(start: Date, end: Date): number {
  const ms = startOfUtcDay(end).getTime() - startOfUtcDay(start).getTime();
  return Math.round(ms / 86_400_000);
}

function startOfUtcDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function describeRecurrence(rule: RecurrenceRule, anchorDate?: string): string {
  switch (rule.frequency) {
    case 'none':
      return 'Does not repeat';
    case 'daily':
      return rule.interval && rule.interval > 1 ? `Every ${rule.interval} days` : 'Every day';
    case 'weekly': {
      if (anchorDate) {
        const weekday = parseDateKey(anchorDate).toLocaleDateString(undefined, {
          weekday: 'long',
        });
        return `Every ${weekday}`;
      }
      return 'Every week';
    }
    case 'weekdays': {
      const days = [...(rule.weekdays ?? [])].sort();
      if (days.length === 0) return 'Specific weekdays';
      const labels = days.map((day) =>
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      );
      return `Every ${labels.join(', ')}`;
    }
    case 'monthly':
      return rule.interval && rule.interval > 1
        ? `Every ${rule.interval} months`
        : 'Every month';
    case 'custom':
      return `Every ${rule.interval ?? 1} days`;
    default:
      return 'Does not repeat';
  }
}

export function occursOnDate(task: Task, dateKey: string): boolean {
  const rule = task.recurrence;
  const target = parseDateKey(dateKey);
  const start = parseDateKey(task.date);

  if (target < startOfUtcDay(start)) return false;
  if (rule.endDate && dateKey > rule.endDate) return false;

  switch (rule.frequency) {
    case 'none':
      return dateKey === task.date;
    case 'daily': {
      const interval = Math.max(1, rule.interval ?? 1);
      return daysBetween(start, target) % interval === 0;
    }
    case 'weekly': {
      const interval = Math.max(1, rule.interval ?? 1);
      if (target.getDay() !== start.getDay()) return false;
      const weeks = Math.floor(daysBetween(start, target) / 7);
      return weeks % interval === 0;
    }
    case 'weekdays': {
      const selected = rule.weekdays ?? [];
      return selected.includes(target.getDay());
    }
    case 'monthly': {
      const interval = Math.max(1, rule.interval ?? 1);
      const monthDelta =
        (target.getFullYear() - start.getFullYear()) * 12 +
        (target.getMonth() - start.getMonth());
      if (monthDelta < 0 || monthDelta % interval !== 0) return false;
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      const expectedDay = Math.min(start.getDate(), lastDay);
      return target.getDate() === expectedDay;
    }
    case 'custom': {
      const interval = Math.max(1, rule.interval ?? 1);
      return daysBetween(start, target) % interval === 0;
    }
    default:
      return false;
  }
}

export function nextOccurrenceDates(task: Task, fromDateKey: string, count: number): string[] {
  const results: string[] = [];
  let cursor = parseDateKey(fromDateKey);
  let guard = 0;
  while (results.length < count && guard < 800) {
    const key = toDateKey(cursor);
    if (occursOnDate(task, key)) results.push(key);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return results;
}
