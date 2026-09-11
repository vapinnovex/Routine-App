import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors, scheme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          ...(Platform.OS === "web"
            ? {
                boxShadow:
                  scheme === "light"
                    ? "0 8px 18px rgba(28, 25, 23, 0.06)"
                    : "none",
              }
            : { shadowOpacity: scheme === "light" ? 0.06 : 0 }),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...(Platform.OS === "web"
      ? {}
      : {
          shadowColor: "#1C1917",
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
        }),
    elevation: 2,
  },
});
