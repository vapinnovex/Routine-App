import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { clearAllLocalData, exportLocalData } from "@/services/exportData";
import { requestNotificationPermission } from "@/services/notifications";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useToastStore } from "@/store/toastStore";
import { useUserStore } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { ThemePreference } from "@/types/models";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

export function SettingsScreen() {
  const { colors } = useAppTheme();
  const user = useUserStore((state) => state.user);
  const updateName = useUserStore((state) => state.updateName);
  const updatePreferences = useUserStore((state) => state.updatePreferences);
  const tasks = useTaskStore((state) => state.tasks);
  const occurrences = useTaskStore((state) => state.occurrences);
  const sessions = useTimerStore((state) => state.sessions);
  const taskChanges = useTaskStore((state) => state.hasUserChanges);
  const sessionChanges = useTimerStore((state) => state.hasUserChanges);
  const [name, setName] = useState(user?.name ?? "");
  const [savedName, setSavedName] = useState(user?.name ?? "");
  const [confirmClear, setConfirmClear] = useState(false);
  const preferences = user?.preferences;
  const hasChangedData =
    Object.keys(occurrences).length > 0 ||
    taskChanges ||
    sessionChanges ||
    (user?.sampleDataInstalled
      ? tasks.length !== 7 || sessions.length !== 6
      : tasks.length > 0 || sessions.length > 0);

  useEffect(() => {
    const nextName = user?.name ?? "";
    setName(nextName);
    setSavedName(nextName);
  }, [user?.name]);

  if (!preferences) return null;

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <AppText color={colors.primary}>Back</AppText>
      </Pressable>
      <AppText variant="heading" style={{ marginVertical: spacing.md }}>
        Settings
      </AppText>

      <Card style={{ gap: spacing.sm }}>
        <AppText variant="caption" muted>
          Profile
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
        {name.trim() !== savedName.trim() ? (
          <Button
            label="Save profile"
            onPress={() => {
              const nextName = name.trim();
              if (!nextName) return;
              updateName(nextName);
              setName(nextName);
              setSavedName(nextName);
              useToastStore.getState().show("Profile saved");
            }}
          />
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <AppText variant="caption" muted>
          Appearance
        </AppText>
        <View style={styles.row}>
          {THEMES.map((theme) => (
            <Pressable
              key={theme}
              onPress={() => updatePreferences({ theme })}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    preferences.theme === theme
                      ? colors.primary
                      : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                color={
                  preferences.theme === theme
                    ? colors.textInverse
                    : colors.textPrimary
                }
              >
                {theme[0].toUpperCase() + theme.slice(1)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Row
          label="Notifications"
          value={preferences.notificationsEnabled}
          onChange={async (value) => {
            if (value) await requestNotificationPermission();
            updatePreferences({ notificationsEnabled: value });
          }}
        />
        <Row
          label="Task reminders"
          value={preferences.taskRemindersEnabled}
          onChange={(value) =>
            updatePreferences({ taskRemindersEnabled: value })
          }
        />
        <Row
          label="Timer notifications"
          value={preferences.timerNotificationsEnabled}
          onChange={(value) =>
            updatePreferences({ timerNotificationsEnabled: value })
          }
        />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Row
          label="Sound"
          value={preferences.soundEnabled}
          onChange={(value) => updatePreferences({ soundEnabled: value })}
        />
        <Row
          label="Haptics"
          value={preferences.hapticsEnabled}
          onChange={(value) => updatePreferences({ hapticsEnabled: value })}
        />
      </Card>

      <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <AppText variant="caption" muted>
          Data
        </AppText>
        <Button
          label="Export data"
          variant="secondary"
          onPress={async () => {
            const result = await exportLocalData();
            useToastStore.getState().show(result.message);
          }}
        />
        <Button
          label="Clear local data"
          variant="danger"
          disabled={!hasChangedData}
          onPress={() => setConfirmClear(true)}
        />
      </Card>

      <ConfirmationDialog
        visible={confirmClear}
        title="Clear everything?"
        message="This removes tasks, sessions, and your local profile from this device."
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          await clearAllLocalData();
          router.replace("/welcome");
        }}
      />
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <AppText>{label}</AppText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 48 },
  row: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
  },
});
