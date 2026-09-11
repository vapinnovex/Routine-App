import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { formatClock } from '@/utils/format';
import { timerImmersive } from '@/constants/theme';

export function TimerDisplay({ remainingMs }: { remainingMs: number }) {
  return (
    <View style={styles.wrap}>
      <AppText style={styles.time} color={timerImmersive.text} accessibilityRole="timer">
        {formatClock(remainingMs)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  time: {
    fontSize: 72,
    lineHeight: 80,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
});
