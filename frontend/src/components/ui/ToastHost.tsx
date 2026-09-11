import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useToastStore } from '@/store/toastStore';
import { useAppTheme } from '@/theme/ThemeProvider';

export function ToastHost() {
  const { colors } = useAppTheme();
  const message = useToastStore((state) => state.message);
  const clear = useToastStore((state) => state.clear);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 2200);
    return () => clearTimeout(timer);
  }, [clear, message]);

  if (!message) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(160)}
      style={[styles.toast, { backgroundColor: colors.textPrimary }]}
    >
      <AppText color={colors.textInverse}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 110,
    borderRadius: radius.md,
    padding: spacing.md,
    zIndex: 50,
  },
});
