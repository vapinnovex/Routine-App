import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          borderTopWidth: 1,
          borderRadius: 18,
          marginHorizontal: 0,
          marginBottom: 0,
          paddingHorizontal: 8,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Icon name="home" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <Icon name="tasks" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: "Timer",
          tabBarIcon: ({ color }) => (
            <Icon name="timer" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
