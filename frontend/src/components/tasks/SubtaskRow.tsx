import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Checkbox } from '@/components/ui/Checkbox';
import { AppText } from '@/components/ui/Text';

export function SubtaskRow({
  title,
  completed,
  onToggle,
  onLongPress,
}: {
  title: string;
  completed: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable onLongPress={onLongPress} style={styles.row} accessibilityLabel={title}>
      <Checkbox checked={completed} onToggle={onToggle} label={`Complete ${title}`} />
      <View style={{ flex: 1 }}>
        <AppText style={{ textDecorationLine: completed ? 'line-through' : 'none', opacity: completed ? 0.55 : 1 }}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
