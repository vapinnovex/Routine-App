import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import { useUserStore } from '@/store/userStore';
import { signIn, flushChanges } from '@/services/accountSync';
import { useAppTheme } from '@/theme/ThemeProvider';

export function WelcomeScreen() {
  const { colors } = useAppTheme();
  const installTasks = useTaskStore((state) => state.installSampleTasks);
  const installSessions = useTimerStore((state) => state.installSampleSessions);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [withSample, setWithSample] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(mode, email, password, name);
      if (mode === 'register' && withSample) {
        installTasks();
        installSessions();
        useUserStore.getState().markSampleInstalled(true);
        await flushChanges();
      }
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally { setBusy(false); }
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
          Sign in to keep your tasks, progress, and timers in your account across devices.
        </AppText>
        {mode === 'register' && <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          accessibilityLabel="Name"
          maxLength={250}
          editable={!busy}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
        />}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" accessibilityLabel="Email"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!busy}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" accessibilityLabel="Password"
          secureTextEntry autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          editable={!busy} maxLength={128} placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        {mode === 'register' && <>
          <AppText muted>Use at least 10 characters for your password.</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText>Include sample tasks and timers</AppText>
            <Switch value={withSample} onValueChange={setWithSample} disabled={busy} accessibilityLabel="Include sample data" />
          </View>
        </>}
        {error && <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText>}
        <Button label={busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          disabled={busy || !email.trim() || !password || (mode === 'register' && (!name.trim() || password.length < 10))}
          onPress={() => void start()} />
        <Button label={mode === 'login' ? 'New here? Create an account' : 'Already registered? Log in'}
          variant="ghost" disabled={busy} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 48, gap: spacing.md },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 54, marginVertical: spacing.sm },
});
