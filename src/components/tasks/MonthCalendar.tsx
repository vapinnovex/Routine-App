import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import type { DayProgress } from '@/services/stats';
import { daysInMonth, parseDateKey, weekdayLabel } from '@/utils/dates';
import { useAppTheme } from '@/theme/ThemeProvider';

function tone(day: DayProgress | undefined, empty: string, colors: ReturnType<typeof useAppTheme>['colors']) {
  if (!day || day.total === 0) return { bg: empty, label: 'No tasks' };
  if (day.rate === 1) return { bg: colors.success, label: 'Completed' };
  if ((day.rate ?? 0) > 0) return { bg: colors.warning, label: 'Partial' };
  return { bg: colors.border, label: 'Not started' };
}

export function MonthCalendar({
  year,
  monthIndex,
  days,
  selected,
  onSelect,
}: {
  year: number;
  monthIndex: number;
  days: DayProgress[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const { colors } = useAppTheme();
  const first = new Date(year, monthIndex, 1).getDay();
  const total = daysInMonth(year, monthIndex);
  const cells: Array<{ key: string; date?: string; dayNum?: number }> = [];
  for (let i = 0; i < first; i += 1) cells.push({ key: `e-${i}` });
  for (let d = 1; d <= total; d += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ key: date, date, dayNum: d });
  }

  return (
    <View>
      <View style={styles.week}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <AppText key={day} variant="caption" muted style={styles.cell}>
            {weekdayLabel(day)}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          const day = days.find((item) => item.date === cell.date);
          const marker = tone(day, 'transparent', colors);
          const isSelected = cell.date === selected;
          return (
            <Pressable
              key={cell.key}
              disabled={!cell.date}
              onPress={() => cell.date && onSelect(cell.date)}
              style={[styles.cell, styles.day, isSelected && { backgroundColor: colors.primaryMuted, borderRadius: radius.md }]}
              accessibilityLabel={
                cell.date
                  ? `${parseDateKey(cell.date).toDateString()}, ${marker.label}`
                  : undefined
              }
            >
              {cell.dayNum ? (
                <>
                  <AppText variant="caption">{cell.dayNum}</AppText>
                  <View style={[styles.dot, { backgroundColor: marker.bg }]} />
                </>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: spacing.xs },
  day: { minHeight: 44, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});
