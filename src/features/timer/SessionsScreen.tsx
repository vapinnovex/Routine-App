import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet } from "@/components/ui/ModalSheet";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { totalDurationSeconds } from "@/services/timerEngine";
import { useTimerStore } from "@/store/timerStore";
import { useToastStore } from "@/store/toastStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatDuration, plural } from "@/utils/format";

export function SessionsScreen() {
  const { colors } = useAppTheme();
  const sessions = useTimerStore((state) => state.sessions);
  const startSession = useTimerStore((state) => state.startSession);
  const duplicateSession = useTimerStore((state) => state.duplicateSession);
  const deleteSession = useTimerStore((state) => state.deleteSession);
  const moveSession = useTimerStore((state) => state.moveSession);
  const startQuickTimer = useTimerStore((state) => state.startQuickTimer);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMinutes, setQuickMinutes] = useState("25");

  return (
    <Screen>
      <View style={styles.head}>
        <AppText variant="heading">Sessions</AppText>
        <Pressable
          onPress={() => router.push("/session/edit")}
          style={[styles.add, { backgroundColor: colors.primary }]}
          accessibilityLabel="Create session"
        >
          <Icon name="plus" color={colors.textInverse} />
        </Pressable>
      </View>
      <AppText muted style={{ marginBottom: spacing.md }}>
        Build reusable routines with timed sections.
      </AppText>
      <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <AppText variant="subheading">Quick timer</AppText>
        <AppText variant="caption" muted>
          Start a simple focus timer without creating a session.
        </AppText>
        <Button
          label="Choose duration"
          variant="secondary"
          onPress={() => setQuickOpen(true)}
        />
      </Card>
      {sessions.length === 0 ? (
        <EmptyState
          title="No saved sessions yet."
          body="Build a routine you can reuse anytime."
          actionLabel="Create Session"
          onAction={() => router.push("/session/edit")}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {sessions.map((session, index) => (
            <Pressable
              key={session.id}
              onLongPress={() => moveSession(session.id, index === 0 ? 1 : -1)}
              delayLongPress={280}
              accessibilityLabel="Hold to move session"
            >
              <Card style={{ gap: spacing.sm }}>
                <AppText variant="subheading">{session.name}</AppText>
                <AppText muted>
                  {session.sections.length}{" "}
                  {plural(session.sections.length, "section")} ·{" "}
                  {formatDuration(totalDurationSeconds(session.sections))}
                </AppText>
                {session.category ? (
                  <AppText variant="caption">{session.category}</AppText>
                ) : null}
                <View style={styles.row}>
                  <Button
                    label="Start"
                    onPress={() => {
                      const active = startSession(session.id);
                      if (active) router.push("/session/run");
                    }}
                    style={{ flex: 1 }}
                  />
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/session/edit",
                        params: { id: session.id },
                      })
                    }
                    accessibilityLabel="Edit session"
                  >
                    <Icon name="edit" color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      duplicateSession(session.id);
                      useToastStore.getState().show("Session duplicated");
                    }}
                    accessibilityLabel="Duplicate session"
                  >
                    <Icon name="copy" color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => setPendingDelete(session.id)}
                    accessibilityLabel="Delete session"
                  >
                    <Icon name="trash" color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      <BottomSheet
        visible={quickOpen}
        title="Quick timer duration"
        onClose={() => setQuickOpen(false)}
      >
        <TextInput
          value={quickMinutes}
          onChangeText={setQuickMinutes}
          keyboardType="number-pad"
          selectTextOnFocus
          placeholder="Minutes"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.quickInput,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
        <View style={styles.quickActions}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setQuickOpen(false)}
            style={{ flex: 1 }}
          />
          <Button
            label="Start timer"
            onPress={() => {
              const minutes = Math.max(1, Number(quickMinutes) || 0);
              startQuickTimer(minutes * 60);
              setQuickOpen(false);
              router.push("/session/run");
            }}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>
      <ConfirmationDialog
        visible={Boolean(pendingDelete)}
        title="Delete this session?"
        message="You can always create it again later."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSession(pendingDelete);
          setPendingDelete(null);
          useToastStore.getState().show("Session deleted");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  add: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quickInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    fontSize: 18,
  },
  quickActions: { flexDirection: "row", gap: spacing.sm },
});
