import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/ModalSheet";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

export function QuickTimerSheet({
  visible,
  onClose,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  onStart: (durationSeconds: number) => void;
}) {
  const { colors } = useAppTheme();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  return (
    <BottomSheet
      visible={visible}
      title="Quick timer duration"
      onClose={onClose}
    >
      <View style={styles.durationWheel}>
        <DurationWheel
          label="Hours"
          value={hours}
          max={11}
          onChange={setHours}
          mutedColor={colors.textSecondary}
        />
        <DurationWheel
          label="Minutes"
          value={minutes}
          max={59}
          onChange={setMinutes}
          mutedColor={colors.textSecondary}
        />
        <DurationWheel
          label="Seconds"
          value={seconds}
          max={59}
          onChange={setSeconds}
          mutedColor={colors.textSecondary}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <Button
          label="Start timer"
          onPress={() =>
            onStart(Math.max(1, hours * 3600 + minutes * 60 + seconds))
          }
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheet>
  );
}

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
  }, [value]);

  const updateFromOffset = (offset: number) => {
    const next = Math.max(0, Math.min(max, Math.round(offset / itemHeight)));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.column}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View style={styles.frame}>
        <ScrollView
          ref={scrollRef}
          style={styles.wheel}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          alwaysBounceVertical
          snapToInterval={itemHeight}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(event) => {
            if (Platform.OS === "web") {
              updateFromOffset(event.nativeEvent.contentOffset.y);
            }
          }}
          onMomentumScrollEnd={(event) =>
            updateFromOffset(event.nativeEvent.contentOffset.y)
          }
          onScrollEndDrag={(event) =>
            updateFromOffset(event.nativeEvent.contentOffset.y)
          }
        >
          {Array.from({ length: max + 1 }, (_, item) => (
            <View key={item} style={styles.item}>
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

const styles = StyleSheet.create({
  durationWheel: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.sm,
  },
  column: { alignItems: "center", gap: spacing.xs, minWidth: 82 },
  frame: {
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.25)",
    borderRadius: 14,
    overflow: "hidden",
  },
  wheel: { height: 132, maxHeight: 132, width: 76, flexGrow: 0, flexShrink: 1 },
  content: { paddingVertical: 44 },
  item: { height: 44, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: spacing.sm },
});
