/**
 * In-app navigation. Tabs for the five primary destinations; everything
 * else stacks above as a regular pushed screen.
 */

import { Tabs } from "expo-router";
import { colors } from "@/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent.roseDark,
        tabBarInactiveTintColor: colors.fg.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.card,
          borderTopColor: colors.border.default,
        },
        headerStyle: { backgroundColor: colors.bg.page },
        headerTitleStyle: { color: colors.fg.primary },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="health-log" options={{ title: "Log" }} />
      <Tabs.Screen name="chatbot" options={{ title: "Chat" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />

      {/* Stacked screens — hidden from the tab bar */}
      <Tabs.Screen name="vitals" options={{ href: null, title: "Vitals" }} />
      <Tabs.Screen name="log-bp" options={{ href: null, title: "Log Blood Pressure" }} />
      <Tabs.Screen name="log-mood" options={{ href: null, title: "Log Mood" }} />
      <Tabs.Screen name="camera-rppg" options={{ href: null, title: "Measure Heart Rate" }} />
      <Tabs.Screen name="voice-journal" options={{ href: null, title: "Voice Journal" }} />
      <Tabs.Screen
        name="voice-journal-native"
        options={{ href: null, title: "Voice Journal (Native)" }}
      />
      <Tabs.Screen name="doctor-prep" options={{ href: null, title: "Doctor Visit" }} />
      <Tabs.Screen name="self-advocacy" options={{ href: null, title: "Self-advocacy" }} />
      <Tabs.Screen name="alert/red-flag" options={{ href: null, title: "Alert" }} />
      <Tabs.Screen name="alert/emergency" options={{ href: null, title: "Emergency" }} />
    </Tabs>
  );
}
