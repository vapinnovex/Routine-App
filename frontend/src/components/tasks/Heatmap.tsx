import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import type { DayProgress } from '@/services/stats';
import { parseDateKey } from '@/utils/dates';
import { useAppTheme } from '@/theme/ThemeProvider';

export function Heatmap({ days }: { days: DayProgress[] }) {
  const { colors } = useAppTheme();
  if (days.length === 0) return null;
  const startPad = parseDateKey(days[0].date).getDay();
  const cells: Array<DayProgress | null> = [...Array.from({ length: startPad }, () => null), ...days];

  const colorFor = (day: DayProgress | null) => {
    if (!day || day.rate === null) return colors.heatmap0;
    if (day.rate === 0) return colors.heatmap1;
    if (day.rate < 0.5) return colors.heatmap2;
    if (day.rate < 1) return colors.heatmap3;
    return colors.heatmap4;
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.labels}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
          <AppText key={`${label}-${index}`} variant="caption" muted style={styles.label}>
            {label}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => (
          <View
            key={day?.date ?? `pad-${index}`}
            style={[styles.cell, { backgroundColor: colorFor(day) }]}
            accessibilityLabel={
              day
                ? `${day.date}: ${day.rate === null ? 'no tasks' : `${Math.round((day.rate ?? 0) * 100)}% complete`}`
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row' },
  label: { width: '14.28%', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: {
    width: '12.8%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
});
