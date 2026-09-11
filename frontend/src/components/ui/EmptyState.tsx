import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <AppText variant="subheading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText muted style={{ textAlign: 'center' }}>
        {body}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
});
