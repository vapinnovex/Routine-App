import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { radius } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function Checkbox({
  checked,
  onToggle,
  label,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[
        styles.box,
        {
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : "transparent",
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {checked ? (
        <Icon name="check" color={colors.textInverse} size={16} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
