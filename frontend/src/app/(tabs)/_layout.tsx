import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router/js-tabs";

import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function TabLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(12, (width - 856) / 2);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: "absolute",
          left: side,
          right: side,
          bottom: Math.max(12, insets.bottom),
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
