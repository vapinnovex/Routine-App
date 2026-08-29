import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import DraggableFlatList, {
    ScaleDecorator,
    type RenderItemParams,
} from "react-native-draggable-flatlist";

import { SectionRow } from "@/components/timer/SectionRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet } from "@/components/ui/ModalSheet";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";
import { useTimerStore } from "@/store/timerStore";
import { useToastStore } from "@/store/toastStore";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { TimerSection, TimerSectionType } from "@/types/models";
import { CATEGORIES } from "@/types/models";
import { createId } from "@/utils/id";

function emptySection(): TimerSection {
  return {
    id: createId(),
    title: "",
    type: "activity",
    durationSeconds: 45,
    order: 0,
  };
}

export function SessionEditorScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const existing = useTimerStore((state) =>
    state.sessions.find((session) => session.id === id),
  );
  const saveSession = useTimerStore((state) => state.saveSession);

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<string | null>(
    existing?.category ?? null,
  );
  const [sections, setSections] = useState<TimerSection[]>(
    existing?.sections.slice().sort((a, b) => a.order - b.order) ?? [
      { ...emptySection(), title: "Focus", durationSeconds: 25 * 60 },
      {
        ...emptySection(),
        title: "Break",
        type: "break",
        durationSeconds: 5 * 60,
        order: 1,
      },
    ],
  );
  const [editing, setEditing] = useState<TimerSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reorderingSections, setReorderingSections] = useState(false);
  const baseline = JSON.stringify({
    name: existing?.name ?? "",
    category: existing?.category ?? null,
    sections:
      existing?.sections.slice().sort((a, b) => a.order - b.order) ?? [],
  });
  const dirty =
    !existing || JSON.stringify({ name, category, sections }) !== baseline;

  const save = () => {
    if (!name.trim()) {
      setError("Name this session.");
      return;
    }
    if (sections.length === 0) {
      setError("Add at least one section.");
      return;
    }
    if (sections.some((section) => section.durationSeconds < 1)) {
      setError("Each section needs a duration of at least 1 second.");
      return;
    }
    saveSession(
      {
        name,
        category,
        sections: sections.map((section) => ({
          title: section.title || "Section",
          type: section.type,
          durationSeconds: section.durationSeconds,
        })),
      },
      existing?.id,
    );
    useToastStore.getState().show("Session saved");
    router.back();
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <AppText color={colors.primary}>Cancel</AppText>
      </Pressable>
      <AppText variant="heading" style={{ marginVertical: spacing.md }}>
        {existing ? "Edit session" : "Create session"}
      </AppText>
      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="Morning workout"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}

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

      <AppText
        variant="caption"
        muted
        style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
      >
        Sections
      </AppText>
      {sections.length > 1 ? (
        <Pressable
          onPress={() => setReorderingSections((value) => !value)}
          accessibilityLabel={
            reorderingSections
              ? "Finish reordering sections"
              : "Reorder sections"
          }
          style={styles.shuffle}
        >
          <Icon
            name={reorderingSections ? "check" : "shuffle"}
            color={colors.secondary}
            size={20}
          />
        </Pressable>
      ) : null}
      <DraggableFlatList
        data={sections}
        keyExtractor={(section) => section.id}
        scrollEnabled={false}
        renderItem={({
          item: section,
          getIndex,
          drag,
          isActive,
        }: RenderItemParams<TimerSection>) => (
          <ScaleDecorator>
            <View
              style={{ marginBottom: spacing.sm, opacity: isActive ? 0.7 : 1 }}
            >
              <SectionRow
                section={section}
                index={getIndex() ?? 0}
                onLongPress={reorderingSections ? drag : undefined}
                showDragHandle={reorderingSections}
                onEdit={() => setEditing(section)}
                onDelete={() =>
                  setSections((current) =>
                    current.filter((item) => item.id !== section.id),
                  )
                }
              />
            </View>
          </ScaleDecorator>
        )}
        onDragEnd={({ data }) =>
          setSections(data.map((section, order) => ({ ...section, order })))
        }
      />
      <Button
        label="Add section"
        variant="secondary"
        onPress={() =>
          setSections((current) => [
            ...current,
            { ...emptySection(), order: current.length },
          ])
        }
        style={{ marginTop: spacing.md }}
      />
      <Button
        label="Save session"
        onPress={save}
        disabled={!dirty}
        style={{ marginTop: spacing.sm }}
      />

      {editing ? (
        <SectionEditor
          key={editing.id}
          section={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            setSections((current) =>
              current.map((item) => (item.id === next.id ? next : item)),
            );
            setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function SectionEditor({
  section,
  onClose,
  onSave,
}: {
  section: TimerSection;
  onClose: () => void;
  onSave: (section: TimerSection) => void;
}) {
  const { colors } = useAppTheme();
  const [title, setTitle] = useState(section.title);
  const [type, setType] = useState<TimerSectionType>(section.type);
  const [hours, setHours] = useState(
    Math.floor(section.durationSeconds / 3600),
  );
  const [minutes, setMinutes] = useState(
    Math.floor((section.durationSeconds % 3600) / 60),
  );
  const [seconds, setSeconds] = useState(section.durationSeconds % 60);

  return (
    <BottomSheet visible onClose={onClose} title="Section">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Push ups"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <View style={styles.chips}>
        {(["activity", "break"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setType(value)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  type === value ? colors.secondary : colors.surfaceMuted,
              },
            ]}
          >
            <AppText
              color={type === value ? colors.textInverse : colors.textPrimary}
            >
              {value === "activity" ? "Activity" : "Break"}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Card>
        <DurationField
          label="Hours"
          value={hours}
          onChange={setHours}
          max={12}
        />
        <DurationField
          label="Minutes"
          value={minutes}
          onChange={setMinutes}
          max={59}
        />
        <DurationField
          label="Seconds"
          value={seconds}
          onChange={setSeconds}
          max={59}
        />
      </Card>
      <Button
        label="Done"
        onPress={() =>
          onSave({
            ...section,
            title: title || section.title,
            type,
            durationSeconds: hours * 3600 + minutes * 60 + seconds,
          })
        }
      />
    </BottomSheet>
  );
}

function DurationField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <View style={styles.duration}>
      <AppText>{label}</AppText>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <AppText variant="heading">−</AppText>
        </Pressable>
        <AppText variant="subheading">{value}</AppText>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          accessibilityLabel={`Increase ${label}`}
        >
          <AppText variant="heading">+</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    minHeight: 52,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  duration: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  shuffle: {
    alignSelf: "flex-end",
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
});
