import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from "react-native";
import DraggableFlatList, {
    ScaleDecorator,
    type RenderItemParams,
} from "@/components/ui/ReorderableList";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
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
  const { colors, scheme } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const existing = useTaskStore((state) =>
    state.tasks.find((task) => task.id === id),
  );
  const createTask = useTaskStore((state) => state.createTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const sessions = useTimerStore((state) => state.sessions);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<string | null>(
    existing?.category ?? null,
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    existing?.priority ?? "medium",
  );
  const [estimatedDuration, setEstimatedDuration] = useState(
    existing?.estimatedDurationMinutes
      ? String(existing.estimatedDurationMinutes)
      : "",
  );
  const [linkedTimerSessionId, setLinkedTimerSessionId] = useState<
    string | null
  >(existing?.linkedTimerSessionId ?? null);
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
    String(existing?.recurrence.interval ?? 1),
  );
  const [subtasks, setSubtasks] = useState(
    existing?.subtasks.map((item) => item.title).join("\n") ?? "",
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [reorderingSubtasks, setReorderingSubtasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurrence = useMemo<RecurrenceRule>(() => {
    const endDate = existing?.recurrence.endDate;
    if (frequency === "weekdays") return { frequency, weekdays, endDate };
    if (frequency === "custom" || frequency === "daily") {
      return { frequency, interval: Math.max(1, Number(interval) || 1), endDate };
    }
    return { frequency, interval: existing?.recurrence.interval, endDate };
  }, [frequency, interval, weekdays, existing]);

  const save = () => {
    if (!title.trim()) {
      setError("Give this task a name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || toDateKey(parseDateKey(date)) !== date) { setError("Enter a valid date as YYYY-MM-DD."); return; }
    if (hasTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setError("Enter a valid time as HH:MM (24-hour)."); return; }
    if (frequency === "weekdays" && weekdays.length === 0) { setError("Choose at least one weekday."); return; }
    if (["custom", "daily"].includes(frequency) && (!Number.isInteger(Number(interval)) || Number(interval) < 1 || Number(interval) > 365)) { setError("Repeat interval must be a whole number from 1 to 365."); return; }
    if (estimatedDuration.trim() && (!Number.isInteger(Number(estimatedDuration)) || Number(estimatedDuration) < 1 || Number(estimatedDuration) > 525600)) { setError("Estimated minutes must be a whole number from 1 to 525600."); return; }
    if (subtasks.split("\n").filter(Boolean).length > 200) { setError("Use at most 200 subtasks."); return; }
    if (recurrence.endDate && recurrence.endDate < date) { setError("Start date cannot be after the repeat end date."); return; }
    const payload = {
      title,
      category,
      date,
      time: hasTime ? time : null,
      recurrence,
      subtasks: subtasks.split("\n"),
      priority,
      estimatedDurationMinutes: estimatedDuration.trim()
        ? Math.max(1, Number(estimatedDuration) || 1)
        : null,
      linkedTimerSessionId,
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
        maxLength={250}
          accessibilityLabel="Name"
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
          {Platform.OS === "web" ? (
            <input type="date" aria-label="Task date" value={date} onChange={(event) => setDate(event.target.value)}
              style={{ width: "100%", minHeight: 44, fontSize: 16, color: colors.textPrimary, background: colors.surface, border: 0, colorScheme: scheme }} />
          ) : (
            <AppText>{date}</AppText>
          )}
        </Pressable>
        {showDate && Platform.OS !== "web" ? (
          <DateTimePicker
            value={parseDateKey(date)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant={scheme}
            textColor={colors.textPrimary}
            onChange={(_, selected) => {
              if (Platform.OS !== "ios") setShowDate(false);
              if (selected) setDate(toDateKey(selected));
            }}
          />
        ) : null}
        <View style={styles.switchRow}>
          <AppText>Time</AppText>
          <Switch
            value={hasTime}
            onValueChange={(value) => {
              setHasTime(value);
              if (value) setShowTime(true);
            }}
          />
        </View>
        {hasTime ? (
          <Pressable onPress={() => setShowTime(true)}>
            {Platform.OS === "web" ? (
              <input type="time" aria-label="Task time" value={time} onChange={(event) => setTime(event.target.value)}
                style={{ width: "100%", minHeight: 44, fontSize: 16, color: colors.textPrimary, background: colors.surface, border: 0, colorScheme: scheme }} />
            ) : (
              <AppText>{time}</AppText>
            )}
          </Pressable>
        ) : (
          <AppText muted>Optional</AppText>
        )}
        {showTime && Platform.OS !== "web" ? (
          <DateTimePicker
            value={(() => {
              const value = parseDateKey(date);
              const [hours, minutes] = time.split(":").map(Number);
              value.setHours(hours, minutes, 0, 0);
              return value;
            })()}
            mode="time"
            themeVariant={scheme}
            textColor={colors.textPrimary}
            onChange={(_, selected) => {
              if (Platform.OS !== "ios") setShowTime(false);
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
        Priority
      </AppText>
      <View style={styles.chips}>
        {(["low", "medium", "high"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setPriority(value)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  priority === value ? colors.primary : colors.surfaceMuted,
              },
            ]}
          >
            <AppText
              color={
                priority === value ? colors.textInverse : colors.textPrimary
              }
            >
              {value[0].toUpperCase() + value.slice(1)}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={[styles.switchRow, { marginTop: spacing.md }]}>
        <AppText>Estimated minutes</AppText>
        <TextInput
          value={estimatedDuration}
          onChangeText={setEstimatedDuration}
          keyboardType="number-pad"
          placeholder="Optional"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.smallInput,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
      </View>
      {sessions.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <AppText variant="caption" muted>
            Linked timer
          </AppText>
          <View style={styles.chips}>
            <Pressable
              onPress={() => setLinkedTimerSessionId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    linkedTimerSessionId === null
                      ? colors.secondary
                      : colors.surfaceMuted,
                },
              ]}
            >
              <AppText
                color={
                  linkedTimerSessionId === null
                    ? colors.textInverse
                    : colors.textPrimary
                }
              >
                None
              </AppText>
            </Pressable>
            {sessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => setLinkedTimerSessionId(session.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      linkedTimerSessionId === session.id
                        ? colors.secondary
                        : colors.surfaceMuted,
                  },
                ]}
              >
                <AppText
                  color={
                    linkedTimerSessionId === session.id
                      ? colors.textInverse
                      : colors.textPrimary
                  }
                >
                  {session.name}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <AppText variant="caption" muted style={styles.label}>
        Repeat
      </AppText>
      <View style={styles.chips}>
        {REPEAT_OPTIONS.map((option) => {
          const active = frequency === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setFrequency(option.value);
                if (option.value === "daily") setInterval("1");
              }}
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
        <View style={styles.subtaskHeader}>
          <AppText variant="caption" muted>
            Add the small steps that make this task complete.
          </AppText>
          {subtasks.split("\n").filter(Boolean).length > 1 ? (
            <Pressable
              onPress={() => setReorderingSubtasks((value) => !value)}
              accessibilityLabel={
                reorderingSubtasks
                  ? "Finish reordering subtasks"
                  : "Reorder subtasks"
              }
              hitSlop={8}
            >
              <Icon
                name={reorderingSubtasks ? "check" : "shuffle"}
                color={colors.secondary}
                size={20}
              />
            </Pressable>
          ) : null}
        </View>
        <DraggableFlatList
        reordering={reorderingSubtasks}
          data={subtasks.split("\n").filter(Boolean)}
          keyExtractor={(item, index) => `${item}-${index}`}
          scrollEnabled={false}
          renderItem={({
            item,
            getIndex,
            drag,
            isActive,
          }: RenderItemParams<string>) => (
            <ScaleDecorator>
              <Pressable
                onLongPress={reorderingSubtasks ? drag : undefined}
                style={[
                  styles.subtaskItem,
                  {
                    backgroundColor: colors.surface,
                    opacity: isActive ? 0.7 : 1,
                    marginBottom: spacing.xs,
                  },
                ]}
                accessibilityLabel={`Hold to move ${item}`}
              >
                {reorderingSubtasks ? (
                  <Icon name="grip" color={colors.textSecondary} size={18} />
                ) : null}
                <AppText style={{ flex: 1 }}>{item}</AppText>
                <Pressable
                  onPress={() => removeSubtask(getIndex() ?? 0)}
                  accessibilityLabel={`Remove ${item}`}
                >
                  <AppText color={colors.danger}>Remove</AppText>
                </Pressable>
              </Pressable>
            </ScaleDecorator>
          )}
          onDragEnd={({ data }) => setSubtasks(data.join("\n"))}
        />
        <View style={styles.subtaskInputRow}>
          <TextInput
            maxLength={250}
          accessibilityLabel="New subtask"
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
  inlineInput: {
    minHeight: 36,
    paddingVertical: 4,
    fontSize: 16,
  },
  area: { minHeight: 120, textAlignVertical: "top" },
  subtaskCard: { borderWidth: 1, gap: spacing.sm },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
