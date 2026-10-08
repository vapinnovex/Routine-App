import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useTimerStore } from "@/store/timerStore";
import { formatDuration } from "@/utils/format";

export function SessionCompleteScreen() {
  const last = useTimerStore((state) => state.lastCompleted);
  const clear = useTimerStore((state) => state.clearLastCompleted);
  const repeatLast = useTimerStore((state) => state.repeatLast);

  if (!last) {
    return (
      <Screen>
        <AppText>Session complete.</AppText>
        <Button
          label="Back to sessions"
          onPress={() => router.replace("/(tabs)/timer")}
        />
      </Screen>
    );
  }

  const total = last.sections.length;
  return (
    <Screen>
      <View style={styles.wrap}>
        <AppText variant="caption" muted>
          SESSION COMPLETE
        </AppText>
        <AppText variant="display" style={{ marginVertical: spacing.sm }}>
          {last.sessionName}
        </AppText>
        <AppText variant="subheading">
          {total} sections in your routine
        </AppText>
        <AppText muted style={{ marginTop: spacing.sm }}>
          Focus time {formatDuration(Math.floor((last.accumulatedFocusMs ?? 0) / 1000))}
        </AppText>
        <AppText style={{ marginTop: spacing.lg }}>Great work.</AppText>
        <View style={{ gap: spacing.sm, marginTop: spacing.xl, width: "100%" }}>
          <Button
            label="Start again"
            onPress={() => {
              const active = repeatLast();
              if (active) router.replace("/session/run");
            }}
          />
          <Button
            label="Back to sessions"
            variant="secondary"
            onPress={() => {
              clear();
              router.replace("/(tabs)/timer");
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", paddingTop: 48 },
});
