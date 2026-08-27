import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import { useUserStore } from '@/store/userStore';
import { useAppTheme } from '@/theme/ThemeProvider';

export function WelcomeScreen() {
  const { colors } = useAppTheme();
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const installTasks = useTaskStore((state) => state.installSampleTasks);
  const installSessions = useTimerStore((state) => state.installSampleSessions);
  const [name, setName] = useState('');

  const start = (withSample: boolean) => {
    const resolved = name.trim() || 'there';
    completeOnboarding(resolved, withSample);
    if (withSample) {
      installTasks();
      installSessions();
    }
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="caption" muted>
          ROUTINE
        </AppText>
        <AppText variant="display" style={{ marginTop: spacing.sm }}>
          Plan the day. Run the session. See the streak.
        </AppText>
        <AppText muted style={{ marginTop: spacing.md }}>
          A calm command center for tasks, progress, and reusable timers. Everything stays on this device.
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <Button label="Get started" onPress={() => start(true)} />
        <Button label="Start empty" variant="ghost" onPress={() => start(false)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 48, gap: spacing.md },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 54, marginVertical: spacing.sm },
});
