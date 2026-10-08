import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/Text";
import { radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.wrap}>
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              marginBottom: 0,
              maxHeight: "76%",
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <AppText variant="heading" style={{ flex: 1 }}>{title}</AppText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close dialog" style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <AppText color={colors.primary}>Close</AppText>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  content: { gap: spacing.md, paddingBottom: spacing.sm },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
});
