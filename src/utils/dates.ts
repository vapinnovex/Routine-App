const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function formatLongDate(date: Date | string): string {
  const value = typeof date === 'string' ? parseDateKey(date) : date;
  return `${WEEKDAY_FULL[value.getDay()]}, ${MONTH_LABELS[value.getMonth()]} ${value.getDate()}`;
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(date: Date | string): string {
  const value = typeof date === 'string' ? parseDateKey(date) : date;
  return `${MONTH_LABELS[value.getMonth()]} ${value.getDate()}`;
}

export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [hRaw, mRaw] = time.split(':');
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${suffix}`;
}

export function weekdayLabel(day: number, full = false): string {
  return full ? WEEKDAY_FULL[day] : WEEKDAY_LABELS[day];
}

export function greetingForHour(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function eachDateKey(start: string, end: string): string[] {
  const keys: string[] = [];
  let cursor = parseDateKey(start);
  const last = parseDateKey(end);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function monthDateKeys(year: number, monthIndex: number): string[] {
  const last = daysInMonth(year, monthIndex);
  const keys: string[] = [];
  for (let day = 1; day <= last; day += 1) {
    keys.push(`${year}-${pad(monthIndex + 1)}-${pad(day)}`);
  }
  return keys;
}
