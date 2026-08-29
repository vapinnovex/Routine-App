import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

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
  const reorderSessions = useTimerStore((state) => state.reorderSessions);
  const startQuickTimer = useTimerStore((state) => state.startQuickTimer);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickHours, setQuickHours] = useState(0);
  const [quickMinutes, setQuickMinutes] = useState(5);
  const [quickSeconds, setQuickSeconds] = useState(0);
  const [reordering, setReordering] = useState(false);

  return (
    <Screen scroll={false}>
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
      {sessions.length === 0 ? (
        <EmptyState
          title="No saved sessions yet."
          body="Build a routine you can reuse anytime."
          actionLabel="Create Session"
          onAction={() => router.push("/session/edit")}
        />
      ) : (
        <DraggableFlatList
          data={sessions}
          keyExtractor={(session) => session.id}
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
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
                      <Icon
                        name="grip"
                        color={colors.textSecondary}
                        size={18}
                      />
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
      )}
      <BottomSheet
        visible={quickOpen}
        title="Quick timer duration"
        onClose={() => setQuickOpen(false)}
      >
        <View style={styles.durationWheel}>
          <DurationWheel
            label="Hours"
            value={quickHours}
            max={11}
            onChange={setQuickHours}
            mutedColor={colors.textSecondary}
          />
          <DurationWheel
            label="Minutes"
            value={quickMinutes}
            max={59}
            onChange={setQuickMinutes}
            mutedColor={colors.textSecondary}
          />
          <DurationWheel
            label="Seconds"
            value={quickSeconds}
            max={59}
            onChange={setQuickSeconds}
            mutedColor={colors.textSecondary}
          />
        </View>
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
              const duration =
                quickHours * 3600 + quickMinutes * 60 + quickSeconds;
              startQuickTimer(Math.max(1, duration));
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
  headActions: { flexDirection: "row", gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dragHandle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  durationWheel: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.sm,
  },
  durationColumn: { alignItems: "center", gap: spacing.xs, minWidth: 82 },
  sessionList: { flex: 1, flexGrow: 1, height: 0, minHeight: 580 },
  sessionListContent: { paddingBottom: 132 },
  wheel: { height: 132, maxHeight: 132, width: 76, flexGrow: 0, flexShrink: 1 },
  wheelFrame: {
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.25)",
    borderRadius: 14,
    overflow: "hidden",
  },
  wheelContent: { paddingVertical: 44 },
  wheelItem: { height: 44, alignItems: "center", justifyContent: "center" },
  durationValue: { minWidth: 58, textAlign: "center" },
  quickActions: { flexDirection: "row", gap: spacing.sm },
});

function DurationWheel({
  label,
  value,
  max,
  onChange,
  mutedColor,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  mutedColor: string;
}) {
  const itemHeight = 44;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: value * itemHeight, animated: false });
  }, []);

  return (
    <View style={styles.durationColumn}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View style={styles.wheelFrame}>
        <ScrollView
          ref={scrollRef}
          style={styles.wheel}
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          alwaysBounceVertical
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onMomentumScrollEnd={(event) => {
            const next = Math.max(
              0,
              Math.min(
                max,
                Math.round(event.nativeEvent.contentOffset.y / itemHeight),
              ),
            );
            onChange(next);
          }}
        >
          {Array.from({ length: max + 1 }, (_, item) => (
            <View key={item} style={styles.wheelItem}>
              <AppText
                variant={item === value ? "subheading" : "body"}
                color={item === value ? undefined : mutedColor}
              >
                {String(item).padStart(2, "0")}
              </AppText>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
