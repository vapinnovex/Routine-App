import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/Text";
import { radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { TimerSection } from "@/types/models";
import { formatDuration } from "@/utils/format";

export function SectionRow({
  section,
  index,
  onLongPress,
  onEdit,
  onDelete,
  showDragHandle = false,
  isDragging = false,
}: {
  section: TimerSection;
  index: number;
  onLongPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDragHandle?: boolean;
  isDragging?: boolean;
}) {
  const { colors } = useAppTheme();
  const isBreak = section.type === "break";

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[
        styles.row,
        { opacity: isDragging ? 0.6 : 1 },
        {
          backgroundColor: isBreak ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {showDragHandle ? (
        <Icon name="grip" color={colors.textSecondary} size={18} />
      ) : null}
      <Pressable onPress={onEdit} style={{ flex: 1 }}>
        <AppText variant="subheading">
          {index + 1}. {section.title}
        </AppText>
        <AppText variant="caption" muted>
          {formatDuration(section.durationSeconds)} ·{" "}
          {isBreak ? "Break" : "Activity"}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityLabel={`Delete ${section.title}`}
        hitSlop={8}
      >
        <Icon name="trash" color={colors.danger} size={18} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  order: { width: 28, textAlign: "center" },
});
