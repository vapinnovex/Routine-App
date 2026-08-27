import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useTaskStore } from "@/store/taskStore";
import { useToastStore } from "@/store/toastStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { RecurrenceFrequency, RecurrenceRule } from "@/types/models";
import { CATEGORIES } from "@/types/models";
import { parseDateKey, toDateKey, todayKey } from "@/utils/dates";

const REPEAT_OPTIONS: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Specific weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "custom", label: "Custom" },
];

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

export function TaskEditorScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const existing = useTaskStore((state) =>
    state.tasks.find((task) => task.id === id),
  );
  const createTask = useTaskStore((state) => state.createTask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<string | null>(
    existing?.category ?? null,
  );
  const [date, setDate] = useState(
    existing?.date ??
      (Array.isArray(params.date) ? params.date[0] : params.date) ??
      todayKey(),
  );
  const [hasTime, setHasTime] = useState(Boolean(existing?.time));
  const [time, setTime] = useState(existing?.time ?? "09:00");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    existing?.recurrence.frequency ?? "none",
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    existing?.recurrence.weekdays ?? [1, 3, 5],
  );
  const [interval, setInterval] = useState(
    String(existing?.recurrence.interval ?? 2),
  );
  const [subtasks, setSubtasks] = useState(
    existing?.subtasks.map((item) => item.title).join("\n") ?? "",
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurrence = useMemo<RecurrenceRule>(() => {
    if (frequency === "weekdays") return { frequency, weekdays };
    if (frequency === "custom" || frequency === "daily") {
      return { frequency, interval: Math.max(1, Number(interval) || 1) };
    }
    return { frequency };
  }, [frequency, interval, weekdays]);

  const save = () => {
    if (!title.trim()) {
      setError("Give this task a name.");
      return;
    }
    const payload = {
      title,
      category,
      date,
      time: hasTime ? time : null,
      recurrence,
      subtasks: subtasks.split("\n"),
    };
    if (existing) updateTask(existing.id, payload);
    else createTask(payload);
    useToastStore.getState().show(existing ? "Task updated" : "Task saved");
    router.back();
  };

  const addSubtask = () => {
    const value = newSubtask.trim();
    if (!value) return;
    setSubtasks((current) => (current.trim() ? `${current}\n${value}` : value));
    setNewSubtask("");
  };

  const removeSubtask = (index: number) => {
    setSubtasks((current) =>
      current
        .split("\n")
        .filter(Boolean)
        .filter((_, itemIndex) => itemIndex !== index)
        .join("\n"),
    );
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <AppText color={colors.primary}>Cancel</AppText>
      </Pressable>
      <AppText variant="heading" style={{ marginVertical: spacing.md }}>
        {existing ? "Edit task" : "New task"}
      </AppText>

      <AppText variant="caption" muted>
        Task name
      </AppText>
      <TextInput
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setError(null);
        }}
        placeholder="Morning gym"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}

      <AppText variant="caption" muted style={styles.label}>
        Category
      </AppText>
      <View style={styles.chips}>
        {CATEGORIES.map((item) => {
          const active = category === item;
          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.primary
                    : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                variant="caption"
                color={active ? colors.textInverse : colors.textPrimary}
              >
                {item}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <Pressable onPress={() => setShowDate(true)}>
          <AppText variant="caption" muted>
            Date
          </AppText>
          <AppText>{date}</AppText>
        </Pressable>
        {showDate ? (
          <DateTimePicker
            value={parseDateKey(date)}
            mode="date"
            onChange={(_, selected) => {
              setShowDate(false);
              if (selected) setDate(toDateKey(selected));
            }}
          />
        ) : null}
        <View style={styles.switchRow}>
          <AppText>Time</AppText>
          <Switch value={hasTime} onValueChange={setHasTime} />
        </View>
        {hasTime ? (
          <Pressable onPress={() => setShowTime(true)}>
            <AppText>{time}</AppText>
          </Pressable>
        ) : (
          <AppText muted>Optional</AppText>
        )}
        {showTime ? (
          <DateTimePicker
            value={(() => {
              const value = parseDateKey(date);
              const [hours, minutes] = time.split(":").map(Number);
              value.setHours(hours, minutes, 0, 0);
              return value;
            })()}
            mode="time"
            onChange={(_, selected) => {
              setShowTime(false);
              if (selected) {
                setTime(
                  `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`,
                );
              }
            }}
          />
        ) : null}
      </Card>

      <AppText variant="caption" muted style={styles.label}>
        Repeat
      </AppText>
      <View style={styles.chips}>
        {REPEAT_OPTIONS.map((option) => {
          const active = frequency === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFrequency(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.secondary
                    : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                variant="caption"
                color={active ? colors.textInverse : colors.textPrimary}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {frequency === "weekdays" ? (
        <View style={styles.chips}>
          {WEEKDAYS.map((day) => {
            const active = weekdays.includes(day.value);
            return (
              <Pressable
                key={day.value}
                onPress={() =>
                  setWeekdays((current) =>
                    current.includes(day.value)
                      ? current.filter((value) => value !== day.value)
                      : [...current, day.value],
                  )
                }
                style={[
                  styles.day,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.surfaceMuted,
                  },
                ]}
              >
                <AppText
                  color={active ? colors.textInverse : colors.textPrimary}
                >
                  {day.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {frequency === "custom" ? (
        <View style={styles.switchRow}>
          <AppText>Every</AppText>
          <TextInput
            keyboardType="number-pad"
            value={interval}
            onChangeText={setInterval}
            style={[
              styles.smallInput,
              { color: colors.textPrimary, borderColor: colors.border },
            ]}
          />
          <AppText>days</AppText>
        </View>
      ) : null}

      <AppText variant="caption" muted style={styles.label}>
        Subtasks
      </AppText>
      <Card
        style={[
          styles.subtaskCard,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <AppText variant="caption" muted>
          Add the small steps that make this task complete.
        </AppText>
        {subtasks
          .split("\n")
          .filter(Boolean)
          .map((item, index) => (
            <View
              key={`${item}-${index}`}
              style={[styles.subtaskItem, { backgroundColor: colors.surface }]}
            >
              <AppText style={{ flex: 1 }}>{item}</AppText>
              <Pressable
                onPress={() => removeSubtask(index)}
                accessibilityLabel={`Remove ${item}`}
              >
                <AppText color={colors.danger}>Remove</AppText>
              </Pressable>
            </View>
          ))}
        <View style={styles.subtaskInputRow}>
          <TextInput
            value={newSubtask}
            onChangeText={setNewSubtask}
            onSubmitEditing={addSubtask}
            returnKeyType="done"
            placeholder="Add a step"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.subtaskInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />
          <Button
            label="Add"
            variant="secondary"
            onPress={addSubtask}
            disabled={!newSubtask.trim()}
          />
        </View>
      </Card>

      <Button
        label={existing ? "Save changes" : "Create task"}
        onPress={save}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 52,
    marginTop: 6,
  },
  area: { minHeight: 120, textAlignVertical: "top" },
  subtaskCard: { borderWidth: 1, gap: spacing.sm },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 12,
    padding: spacing.sm,
  },
  subtaskInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  label: { marginTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  smallInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    textAlign: "center",
  },
});
