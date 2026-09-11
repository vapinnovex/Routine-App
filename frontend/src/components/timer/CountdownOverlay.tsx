import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function CountdownOverlay({
  visible,
  label = "Get ready",
  onComplete,
  onCancel,
}: {
  visible: boolean;
  label?: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const { colors } = useAppTheme();
  const [count, setCount] = useState(3);
  const completeRef = useRef(onComplete);
  const remainingRef = useRef(3);
  const completedRef = useRef(false);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!visible) return;
    remainingRef.current = 3;
    completedRef.current = false;
    setCount(3);
    const interval = setInterval(() => {
      remainingRef.current -= 1;
      setCount(remainingRef.current);
      if (remainingRef.current > 0 || completedRef.current) return;
      completedRef.current = true;
      clearInterval(interval);
      completeRef.current();
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="caption" muted>
            {label}
          </AppText>
          <AppText variant="display" color={colors.primary}>
            {count}
          </AppText>
          <Pressable
            onPress={onCancel}
            accessibilityLabel="Cancel timer countdown"
          >
            <AppText color={colors.primary}>Cancel</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 24,
    padding: spacing.xxl,
    minWidth: 180,
  },
});
