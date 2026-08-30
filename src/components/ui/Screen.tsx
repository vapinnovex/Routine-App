import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function Screen({
  children,
  scroll = true,
  padded = true,
  bottomPadding,
  ...rest
}: ScrollViewProps & {
  scroll?: boolean;
  padded?: boolean;
  bottomPadding?: number;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.sm,
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingBottom: insets.bottom + (bottomPadding ?? 112),
    backgroundColor: colors.background,
    flexGrow: 1,
  };

  if (!scroll) {
    return (
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[styles.fill, { backgroundColor: colors.background }, padding]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={padding}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
