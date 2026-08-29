import type { RecurrenceRule, Task, TimerSession } from "@/types/models";
import { addDays, toDateKey, todayKey } from "@/utils/dates";
import { createId } from "@/utils/id";

function task(input: {
  title: string;
  category: string;
  date: string;
  time?: string | null;
  recurrence?: RecurrenceRule;
  subtasks?: string[];
}): Task {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: input.title,
    category: input.category,
    date: input.date,
    time: input.time ?? null,
    recurrence: input.recurrence ?? { frequency: "none" },
    createdAt: now,
    updatedAt: now,
    archived: false,
    subtasks: (input.subtasks ?? []).map((title) => ({
      id: createId(),
      title,
      completed: false,
      completedAt: null,
    })),
  };
}

function session(
  name: string,
  category: string,
  sections: Array<{
    title: string;
    seconds: number;
    type?: "activity" | "break";
  }>,
): TimerSession {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    category,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    sections: sections.map((section, index) => ({
      id: createId(),
      title: section.title,
      type:
        section.type ??
        (section.title.toLowerCase().includes("break") ? "break" : "activity"),
      durationSeconds: section.seconds,
      order: index,
    })),
  };
}

export function buildSampleTasks(now = new Date()): Task[] {
  const today = todayKey();
  const yesterday = toDateKey(addDays(now, -1));
  return [
    task({
      title: "Wake up before 7 AM",
      category: "Fitness",
      date: yesterday,
      time: "06:45",
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Exercise",
      category: "Fitness",
      date: today,
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Learn something new",
      category: "Learning",
      date: today,
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Meditation",
      category: "Health",
      date: today,
      time: "06:30",
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Walk 5,000 steps",
      category: "Fitness",
      date: today,
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Drink 3 liters of water",
      category: "Health",
      date: today,
      recurrence: { frequency: "daily" },
    }),
    task({
      title: "Sleep by 11 PM",
      category: "Health",
      date: today,
      time: "23:00",
      recurrence: { frequency: "daily" },
    }),
  ];
}

export function buildSampleSessions(): TimerSession[] {
  return [
    session("Morning Workout", "Fitness", [
      { title: "Warm Up", seconds: 45 },
      { title: "Break", seconds: 15, type: "break" },
      { title: "Push Ups", seconds: 45 },
      { title: "Break", seconds: 15, type: "break" },
      { title: "Squats", seconds: 45 },
      { title: "Break", seconds: 15, type: "break" },
      { title: "Plank", seconds: 60 },
    ]),
    session("Pomodoro Focus", "Work", [
      { title: "Focus", seconds: 25 * 60 },
      { title: "Break", seconds: 5 * 60, type: "break" },
      { title: "Focus", seconds: 25 * 60 },
      { title: "Break", seconds: 5 * 60, type: "break" },
      { title: "Focus", seconds: 25 * 60 },
    ]),
    session("Deep Work", "Work", [
      { title: "Study", seconds: 60 * 60 },
      { title: "Break", seconds: 15 * 60, type: "break" },
      { title: "Study", seconds: 60 * 60 },
    ]),
    session("HIIT", "Fitness", [
      { title: "Sprint", seconds: 40 },
      { title: "Rest", seconds: 20, type: "break" },
      { title: "Sprint", seconds: 40 },
      { title: "Rest", seconds: 20, type: "break" },
      { title: "Sprint", seconds: 40 },
      { title: "Rest", seconds: 20, type: "break" },
      { title: "Sprint", seconds: 40 },
      { title: "Rest", seconds: 20, type: "break" },
    ]),
    session("Meditation", "Health", [
      { title: "Breathing", seconds: 10 * 60 },
      { title: "Rest", seconds: 5 * 60, type: "break" },
      { title: "Meditation", seconds: 10 * 60 },
    ]),
    session("Study Session", "Study", [
      { title: "Read", seconds: 30 * 60 },
      { title: "Break", seconds: 5 * 60, type: "break" },
      { title: "Practice", seconds: 25 * 60 },
    ]),
  ];
}
