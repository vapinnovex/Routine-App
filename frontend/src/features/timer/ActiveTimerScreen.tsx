import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AppText } from "@/components/ui/Text";
import { spacing, timerImmersive } from "@/constants/theme";
import { useNow } from "@/hooks/useNow";
import { playChime, successHaptic } from "@/services/feedback";
import {
    remainingMs,
    sectionProgress,
    sessionProgress,
} from "@/services/timerEngine";
import { useTimerStore } from "@/store/timerStore";
import { usePreferences } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import { formatClock, formatDuration, percent } from "@/utils/format";

export function ActiveTimerScreen() {
  const insets = useSafeAreaInsets();
  const [confirmation, setConfirmation] = useState<"end" | "restart" | null>(null);
  const { colors, scheme } = useAppTheme();
  const preferences = usePreferences();
  const active = useTimerStore((state) => state.active);
  const lastCompleted = useTimerStore((state) => state.lastCompleted);
  const tickCatchUp = useTimerStore((state) => state.tickCatchUp);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const skip = useTimerStore((state) => state.skip);
  const previous = useTimerStore((state) => state.previous);
  const restart = useTimerStore((state) => state.restart);
  const end = useTimerStore((state) => state.end);
  const now = useNow(200);
  const lastIndex = useRef(active?.currentIndex ?? 0);
  const announcedSection = useRef<string | null>(null);
  const announcedHalf = useRef<string | null>(null);
  const announcedCountdown = useRef<Set<string>>(new Set());

  const speak = (message: string) => {
    if (Platform.OS === "web" || !preferences.soundEnabled) return;
    void Speech.stop().catch(() => undefined);
    Speech.speak(message, {
      rate: 0.95,
      volume: 1,
      useApplicationAudioSession: false,
      onError: () => undefined,
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;
    let activated = false;

    void activateKeepAwakeAsync()
      .then(() => {
        if (mounted) {
          activated = true;
        } else {
          void deactivateKeepAwake().catch(() => undefined);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      if (activated) void deactivateKeepAwake().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    tickCatchUp();
  }, [now, tickCatchUp]);

  useEffect(() => {
    if (lastCompleted) {
      router.replace("/session/complete");
    }
  }, [lastCompleted]);

  useEffect(() => {
    if (!active) return;
    if (active.currentIndex !== lastIndex.current) {
      lastIndex.current = active.currentIndex;
      void playChime(preferences);
      void successHaptic(preferences);
    }
  }, [active, preferences]);

  useEffect(() => {
    if (!active) return;
    const section = active.sections[active.currentIndex];
    if (!section) return;
    const sectionKey = `${active.sessionId}-${section.id}`;
    const durationMs = section.durationSeconds * 1000;
    const remaining = remainingMs(active, now);

    if (announcedSection.current !== sectionKey) {
      announcedSection.current = sectionKey;
      announcedHalf.current = null;
      announcedCountdown.current = new Set();
      speak(
        `${active.sessionName}. Starting ${section.type}. ${section.title}. ${formatDuration(section.durationSeconds)}.`,
      );
    }

    if (
      active.status === "running" &&
      section.durationSeconds >= 10 &&
      remaining <= durationMs / 2 &&
      remaining > 3500 &&
      announcedHalf.current !== sectionKey
    ) {
      announcedHalf.current = sectionKey;
      speak(`Halfway through ${section.title}.`);
    }

    if (active.status === "running" && remaining > 0 && remaining <= 3000) {
      const seconds = Math.ceil(remaining / 1000);
      const countdownKey = `${sectionKey}-${seconds}`;
      if (!announcedCountdown.current.has(countdownKey)) {
        announcedCountdown.current.add(countdownKey);
        const next = active.sections[active.currentIndex + 1];
        speak(
          seconds === 1
            ? next
              ? `One. Next, ${next.title}.`
              : "One. Session complete. Well done."
            : String(seconds),
        );
      }
    }
  }, [active, now]);

  if (!active) {
    return (
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 24,
            backgroundColor: timerImmersive.activityBg,
          },
        ]}
      >
        <AppText color={timerImmersive.text}>No session running.</AppText>
        <Pressable onPress={() => router.replace("/(tabs)/timer")}>
          <AppText color={timerImmersive.accent}>Back to sessions</AppText>
        </Pressable>
      </View>
    );
  }

  const section = active.sections[active.currentIndex];
  const next = active.sections[active.currentIndex + 1];
  const remaining = remainingMs(active, now);
  const isBreak = section?.type === "break";
  const accent = isBreak ? colors.secondary : colors.primary;
  const timerBackground = isBreak
    ? scheme === "dark"
      ? "#10201F"
      : "#EAF4F1"
    : colors.background;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: timerBackground }}
      contentContainerStyle={[
        styles.root,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          backgroundColor: timerBackground,
        },
      ]}
    >
      <AppText
        variant="caption"
        color={colors.textSecondary}
        style={{ letterSpacing: 1.4 }}
      >
        {active.sessionName.toUpperCase()}
      </AppText>
      <AppText
        variant="display"
        color={colors.textPrimary}
        style={{ marginTop: 12 }}
      >
        {section?.title}
      </AppText>
      <View style={styles.timerCircle}>
        <ProgressRing
          value={sectionProgress(active, now)}
          size={250}
          stroke={14}
          label={formatClock(remaining)}
          labelColor={colors.textPrimary}
        />
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={styles.circleLabel}
        >
          {percent(sectionProgress(active, now) * 100, 100)}% complete
        </AppText>
      </View>
      <AppText color={colors.textSecondary}>
        Section {active.currentIndex + 1} of {active.sections.length}
      </AppText>
      <AppText color={accent} style={{ marginTop: 8 }}>
        {next
          ? `Next: ${next.title} · ${formatDuration(next.durationSeconds)}`
          : "Last section"}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        Session {percent(sessionProgress(active, now) * 100, 100)}% complete
      </AppText>

      <View style={styles.controls}>
        <Control
          label="Previous"
          onPress={previous}
          icon="previous"
          disabled={active.currentIndex === 0}
          colors={colors}
        />
        <Pressable
          onPress={active.status === "paused" ? resume : pause}
          style={[styles.main, { backgroundColor: accent }]}
          accessibilityLabel={active.status === "paused" ? "Resume" : "Pause"}
        >
          <Icon
            name={active.status === "paused" ? "play" : "pause"}
            color={colors.textInverse}
            size={28}
          />
        </Pressable>
        <Control
          label="Skip"
          onPress={skip}
          icon="skip"
          disabled={active.currentIndex >= active.sections.length - 1}
          colors={colors}
        />
      </View>
      <View style={styles.secondary}>
        <Pressable
          onPress={() => setConfirmation("restart")}
          accessibilityLabel="Restart session"
          style={styles.secondaryButton}
        >
          <Icon name="restart" color={colors.textSecondary} size={18} />
          <AppText color={colors.textSecondary}>Restart</AppText>
        </Pressable>
        <Pressable
          onPress={() => setConfirmation("end")}
          accessibilityLabel="End session"
          style={[styles.secondaryButton, styles.endButton]}
        >
          <Icon name="close" color={colors.danger} size={18} />
          <AppText color={colors.danger}>End session</AppText>
        </Pressable>
      </View>
      <ConfirmationDialog visible={confirmation !== null}
        title={confirmation === "end" ? "End this session?" : "Restart this session?"}
        message={confirmation === "end" ? "This unfinished run will not be added to your completed history." : "The timer will start again from the first section."}
        confirmLabel={confirmation === "end" ? "End session" : "Restart"}
        onCancel={() => setConfirmation(null)} onConfirm={() => {
          if (confirmation === "end") { end(); router.replace("/(tabs)/timer"); } else restart();
          setConfirmation(null);
        }} />
    </ScrollView>
  );
}

function Control({
  label,
  onPress,
  icon,
  disabled = false,
  colors,
}: {
  label: string;
  onPress: () => void;
  icon: "skip" | "previous";
  disabled?: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.side, { opacity: disabled ? 0.3 : 1 }]}
    >
      <Icon name={icon} color={colors.textPrimary} />
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.xl },
  timerCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  circleLabel: { marginTop: -46 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 36,
  },
  main: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  side: { alignItems: "center", gap: 6, minWidth: 72 },
  secondary: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(28, 25, 23, 0.18)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  endButton: { borderColor: "rgba(194, 65, 59, 0.45)" },
});
