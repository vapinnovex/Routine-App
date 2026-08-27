import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { radius, spacing, typography } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Button({ label, variant = 'primary', icon, style, disabled, ...rest }: ButtonProps) {
  const { colors } = useAppTheme();
  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surfaceMuted
        : variant === 'danger'
          ? colors.danger
          : 'transparent';
  const textColor =
    variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.86 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
      {...rest}
    >
      <View style={styles.row}>
        {icon}
        <AppText style={[typography.button, { color: textColor }]}>{label}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
