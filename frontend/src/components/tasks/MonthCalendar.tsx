import { useMemo } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/Text";
import { radius, spacing } from "@/constants/theme";
import type { DayProgress } from "@/services/stats";
import { useAppTheme } from "@/theme/ThemeProvider";
import { daysInMonth, parseDateKey, weekdayLabel, todayKey } from "@/utils/dates";

function tone(
  day: DayProgress | undefined,
  empty: string,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  if (!day || day.total === 0) return { bg: empty, label: "No tasks" };
  if (day.date > todayKey()) return { bg: colors.border, label: "Scheduled in the future" };
  if (day.rate === 1) return { bg: colors.success, label: "Completed" };
  if ((day.rate ?? 0) > 0) return { bg: colors.warning, label: "Partial" };
  return { bg: colors.border, label: "Not started" };
}

export type TaskCalendarStatus =
  | "completed"
  | "scheduled"
  | "missed"
  | "invalid"
  | "future";

export function MonthCalendar({
  year,
  monthIndex,
  days,
  selected,
  onSelect,
  onMonthChange,
  getDayStatus,
}: {
  year: number;
  monthIndex: number;
  days: DayProgress[];
  selected: string;
  onSelect: (date: string) => void;
  onMonthChange?: (direction: -1 | 1) => void;
  getDayStatus?: (
    date: string,
    day: DayProgress | undefined,
  ) => TaskCalendarStatus;
}) {
  const { colors } = useAppTheme();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (!onMonthChange || Math.abs(gesture.dx) < 48) return;
          onMonthChange(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [onMonthChange],
  );
  const first = new Date(year, monthIndex, 1).getDay();
  const total = daysInMonth(year, monthIndex);
  const cells: Array<{ key: string; date?: string; dayNum?: number }> = [];
  for (let i = 0; i < first; i += 1) cells.push({ key: `e-${i}` });
  for (let d = 1; d <= total; d += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: date, date, dayNum: d });
  }

  return (
    <View {...panResponder.panHandlers}>
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
          const marker = tone(day, "transparent", colors);
          const taskStatus = cell.date
            ? getDayStatus?.(cell.date, day)
            : undefined;
          const accessibilityStatus = taskStatus
            ? {
                completed: "completed",
                scheduled: "scheduled",
                missed: "not completed",
                future: "scheduled in the future",
                invalid: "not scheduled",
              }[taskStatus]
            : marker.label;
          const isSelected = cell.date === selected;
          return (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !cell.date }}
              disabled={!cell.date}
              onPress={() => cell.date && onSelect(cell.date)}
              style={[
                styles.cell,
                styles.day,
                isSelected && {
                  backgroundColor: colors.primaryMuted,
                  borderRadius: radius.md,
                },
              ]}
              accessibilityLabel={
                cell.date
                  ? `${parseDateKey(cell.date).toDateString()}, ${accessibilityStatus}`
                  : undefined
              }
            >
              {cell.dayNum ? (
                <>
                  <AppText variant="caption">{cell.dayNum}</AppText>
                  {taskStatus ? (
                    <View
                      style={[
                        styles.taskMarker,
                        taskStatus === "completed" && {
                          backgroundColor: colors.success,
                          borderColor: colors.success,
                        },
                        taskStatus === "scheduled" && {
                          borderColor: colors.primary,
                        },
                        taskStatus === "missed" && {
                          backgroundColor: colors.warning,
                          borderColor: colors.warning,
                        },
                        taskStatus === "future" && {
                          borderColor: colors.border,
                        },
                        taskStatus === "invalid" && {
                          borderColor: "transparent",
                        },
                      ]}
                    >
                      {taskStatus === "completed" ? (
                        <Icon
                          name="check"
                          color={colors.textInverse}
                          size={11}
                        />
                      ) : taskStatus === "invalid" ? (
                        <View
                          style={[
                            styles.invalidMark,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      ) : null}
                    </View>
                  ) : (
                    <View
                      style={[styles.dot, { backgroundColor: marker.bg }]}
                    />
                  )}
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
  week: { flexDirection: "row" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", alignItems: "center", paddingVertical: spacing.xs },
  day: { minHeight: 44, justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  taskMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  invalidMark: { width: 8, height: 2, borderRadius: 1 },
});
