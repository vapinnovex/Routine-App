import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import { QuickTimerSheet } from "@/components/timer/QuickTimerSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
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
  const reorderSessions = useTimerStore((state) => state.reorderSessions);
  const startQuickTimer = useTimerStore((state) => state.startQuickTimer);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [reordering, setReordering] = useState(false);

  const listHeader = () => (
    <View>
      <View style={styles.head}>
        <AppText variant="heading">Sessions</AppText>
        <View style={styles.headActions}>
          {sessions.length > 1 ? (
            <Pressable
              onPress={() => setReordering((value) => !value)}
              style={[styles.add, { backgroundColor: colors.secondary }]}
              accessibilityLabel={
                reordering ? "Finish reordering sessions" : "Reorder sessions"
              }
            >
              <Icon
                name={reordering ? "check" : "shuffle"}
                color={colors.textInverse}
                size={20}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push("/session/edit")}
            style={[styles.add, { backgroundColor: colors.primary }]}
            accessibilityLabel="Create session"
          >
            <Icon name="plus" color={colors.textInverse} />
          </Pressable>
        </View>
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
    </View>
  );

  return (
    <Screen scroll={false} bottomPadding={0}>
      <DraggableFlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        containerStyle={styles.sessionListContainer}
        style={styles.sessionList}
        contentContainerStyle={styles.sessionListContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={() => (
          <EmptyState
            title="No saved sessions yet."
            body="Build a routine you can reuse anytime."
            actionLabel="Create Session"
            onAction={() => router.push("/session/edit")}
          />
        )}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        renderItem={({
          item: session,
          drag,
          isActive,
        }: RenderItemParams<(typeof sessions)[number]>) => (
          <ScaleDecorator>
            <View
              style={{
                marginBottom: spacing.md,
                opacity: isActive ? 0.75 : 1,
              }}
            >
              <Card style={{ gap: spacing.sm }}>
                {reordering ? (
                  <Pressable
                    onLongPress={drag}
                    accessibilityLabel={`Hold to move ${session.name}`}
                    style={styles.dragHandle}
                  >
                    <Icon name="grip" color={colors.textSecondary} size={18} />
                    <AppText variant="caption" muted>
                      Hold and drag to reorder
                    </AppText>
                  </Pressable>
                ) : null}
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
            </View>
          </ScaleDecorator>
        )}
        onDragEnd={({ data }) =>
          reorderSessions(data.map((session) => session.id))
        }
      />
      <QuickTimerSheet
        visible={quickOpen}
        onClose={() => setQuickOpen(false)}
        onStart={(duration) => {
          startQuickTimer(duration);
          setQuickOpen(false);
          router.push("/session/run");
        }}
      />
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
  headActions: { flexDirection: "row", gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dragHandle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  sessionList: { flex: 1 },
  sessionListContainer: { flex: 1 },
  sessionListContent: { paddingBottom: 0 },
});
