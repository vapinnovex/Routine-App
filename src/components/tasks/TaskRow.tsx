import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import type { ResolvedOccurrence } from "@/services/occurrences";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatTime } from "@/utils/dates";

export function TaskRow({
  item,
  onToggle,
  onPress,
  onSubtaskToggle,
  onLongPress,
  isDragging = false,
  disabled = false,
}: {
  item: ResolvedOccurrence;
  onToggle: () => void;
  onPress: () => void;
  onSubtaskToggle?: (subtaskId: string) => void;
  onLongPress?: () => void;
  isDragging?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const time = formatTime(item.task.time);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={{ opacity: isDragging ? 0.8 : 1 }}
    >
      <View style={styles.row}>
        <Checkbox
          checked={item.isComplete}
          onToggle={onToggle}
          disabled={disabled}
          label={`Complete ${item.task.title}`}
        />
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.task.title}${item.isComplete ? ", completed" : ""}`}
          style={styles.body}
        >
          <AppText
            variant="subheading"
            style={{
              textDecorationLine: item.isComplete ? "line-through" : "none",
              opacity: item.isComplete ? 0.55 : 1,
            }}
          >
            {item.task.title}
          </AppText>
          <View style={styles.meta}>
            {item.task.category ? (
              <CategoryBadge label={item.task.category} />
            ) : null}
            {item.totalSubtasks > 0 ? (
              <AppText variant="caption" muted>
                {item.completedCount} / {item.totalSubtasks} subtasks
              </AppText>
            ) : null}
            {time ? (
              <AppText variant="caption" color={colors.secondary}>
                {time}
              </AppText>
            ) : null}
          </View>
        </Pressable>
        {item.totalSubtasks > 0 ? (
          <Pressable
            onPress={() => setExpanded((value) => !value)}
            accessibilityLabel={
              expanded ? "Collapse subtasks" : "Expand subtasks"
            }
            style={styles.iconButton}
          >
            <Icon name="chevron" color={colors.primary} size={18} />
          </Pressable>
        ) : null}
      </View>
      {expanded ? (
        <View style={[styles.subtasks, { borderTopColor: colors.border }]}>
          {item.subtasks.map((subtask) => (
            <View key={subtask.id} style={styles.subtaskRow}>
              <Checkbox
                checked={subtask.completed}
                onToggle={() => onSubtaskToggle?.(subtask.id)}
                disabled={disabled}
                label={`Complete ${subtask.title}`}
              />
              <AppText
                style={{
                  flex: 1,
                  textDecorationLine: subtask.completed
                    ? "line-through"
                    : "none",
                  opacity: subtask.completed ? 0.55 : 1,
                }}
              >
                {subtask.title}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  body: { flex: 1, gap: 4 },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    alignItems: "center",
  },
  iconButton: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  subtasks: {
    borderTopWidth: 1,
    marginLeft: 36,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
});
