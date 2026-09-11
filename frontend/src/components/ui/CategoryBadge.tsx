import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/Text';
import { useAppTheme } from '@/theme/ThemeProvider';

export function CategoryBadge({ label }: { label: string | null }) {
  const { colors } = useAppTheme();
  if (!label) return null;
  return (
    <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
      <AppText variant="caption" color={colors.primary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
