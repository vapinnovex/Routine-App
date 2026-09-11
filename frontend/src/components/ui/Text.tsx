import { Text as RNText, type TextProps } from 'react-native';

import { typography } from '@/constants/theme';
import { useAppTheme } from '@/theme/ThemeProvider';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  muted,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      style={[
        typography[variant],
        { color: color ?? (muted ? colors.textSecondary : colors.textPrimary) },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
