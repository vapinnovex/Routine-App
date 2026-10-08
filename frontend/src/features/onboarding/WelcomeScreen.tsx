import { InstallApp } from "@/components/InstallApp";
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { validateAuth, type AuthErrors } from '@/services/authValidation';
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
  const [withSample, setWithSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<AuthErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const updateField = (field: 'name' | 'email' | 'password', value: string) => {
    ({ name: setName, email: setEmail, password: setPassword })[field](value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  };
  const start = async () => {
    if (busy) return;
    const errors = validateAuth(mode, { name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      (errors.name ? nameRef : errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
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
        <InstallApp />
        <AppText variant="caption" muted>
          ROUTINE
        </AppText>
        <AppText variant="display" style={{ marginTop: spacing.sm }}>
          {mode === 'register' ? 'Make room for better days.' : 'Welcome back.'}
        </AppText>
        <AppText muted style={{ marginTop: spacing.md }}>
          {mode === 'register' ? 'Create your account to build routines that last.' : 'Your tasks, timers, and progress. All in one place.'}
        </AppText>
        <View style={styles.form}>
        {mode === 'register' && <View style={styles.field}>
          <AppText variant="caption">Your name</AppText>
          <TextInput ref={nameRef} value={name} onChangeText={(value) => updateField('name', value)}
            placeholder="What should we call you?" accessibilityLabel="Name" autoComplete="name"
            maxLength={250} editable={!busy} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.textPrimary, borderColor: fieldErrors.name ? colors.danger : colors.border, backgroundColor: colors.surface }]} />
          {fieldErrors.name && <AppText variant="caption" color={colors.danger} accessibilityRole="alert">{fieldErrors.name}</AppText>}
        </View>}
        <View style={styles.field}>
          <AppText variant="caption">Email address</AppText>
          <TextInput ref={emailRef} value={email} onChangeText={(value) => updateField('email', value)} placeholder="you@example.com" accessibilityLabel="Email"
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy}
            returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.textPrimary, borderColor: fieldErrors.email ? colors.danger : colors.border, backgroundColor: colors.surface }]} />
          {fieldErrors.email && <AppText variant="caption" color={colors.danger} accessibilityRole="alert">{fieldErrors.email}</AppText>}
        </View>
        <View style={styles.field}>
          <AppText variant="caption">Password</AppText>
          <View style={[styles.passwordRow, { borderColor: fieldErrors.password ? colors.danger : colors.border, backgroundColor: colors.surface }]}>
            <TextInput ref={passwordRef} value={password} onChangeText={(value) => updateField('password', value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Enter your password'} accessibilityLabel="Password"
              secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              returnKeyType="go" onSubmitEditing={() => void start()}
              editable={!busy} maxLength={128} placeholderTextColor={colors.textSecondary}
              style={[styles.passwordInput, { color: colors.textPrimary }]} />
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((value) => !value)} style={styles.reveal}>
              <AppText variant="caption" color={colors.primary}>{showPassword ? 'Hide' : 'Show'}</AppText>
            </Pressable>
          </View>
          {fieldErrors.password ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert">{fieldErrors.password}</AppText>
            : mode === 'register' && <AppText variant="caption" muted>10–128 characters. A memorable phrase works well.</AppText>}
        </View>
        </View>
        {mode === 'register' && <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="caption" style={{ flex: 1, marginRight: spacing.md }}>Start with sample tasks and timers</AppText>
            <Switch value={withSample} onValueChange={setWithSample} disabled={busy} accessibilityLabel="Include sample data" />
          </View>
        </>}
        {error && <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText>}
        <Button label={busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          disabled={busy}
          onPress={() => void start()} />
        <Button label={mode === 'login' ? 'New here? Create an account' : 'Already registered? Log in'}
          variant="ghost" disabled={busy} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setFieldErrors({}); setShowPassword(false); }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, gap: spacing.md, width: '100%', maxWidth: 480, alignSelf: 'center' },
  form: { gap: spacing.lg, marginTop: spacing.sm },
  field: { gap: spacing.xs },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16 },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 54, padding: 16 },
  reveal: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 54 },
});
