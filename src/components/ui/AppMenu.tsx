import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { colors, spacing, typography } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const menuItems: { label: string; icon: IconName; href: string; route: string }[] = [
  { label: "Log Vitals", icon: "list-outline", href: "/(app)/log-bp", route: "log-bp" },
  { label: "Mood Tracker", icon: "happy-outline", href: "/(app)/log-mood", route: "log-mood" },
  { label: "Chatbot", icon: "chatbox-outline", href: "/(app)/chatbot", route: "chatbot" },
  { label: "Resources", icon: "bookmark-outline", href: "/(app)/community", route: "community" },
  { label: "History", icon: "time-outline", href: "/(app)/health-log", route: "health-log" },
  { label: "Test Heart Rate", icon: "camera-outline", href: "/(app)/camera-rppg", route: "camera-rppg" },
  { label: "Homepage", icon: "home-outline", href: "/(app)/dashboard", route: "dashboard" },
];

export function AppMenuButton() {
  const segments = useSegments();
  const [isOpen, setIsOpen] = useState(false);
  const isAppRoute = segments[0] === "(app)";
  const currentRoute = segments[segments.length - 1];

  if (!isAppRoute) return null;

  function navigate(href: string) {
    setIsOpen(false);
    router.push(href as Parameters<typeof router.push>[0]);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
      >
        <Ionicons name="menu" size={38} color={colors.fg.primary} />
      </Pressable>

      <Modal visible={isOpen} animationType="fade" transparent onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.panel}>
            {menuItems.map((item) => {
              const isActive = currentRoute === item.route;

              return (
                <Pressable
                  key={item.label}
                  onPress={() => navigate(item.href)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Ionicons name={item.icon} size={30} color="#0D1727" />
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: "absolute",
    left: 26,
    bottom: 28,
    zIndex: 20,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonPressed: {
    opacity: 0.72,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(8, 42, 113, 0.62)",
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingBottom: 42,
  },
  panel: {
    width: "100%",
    maxWidth: 392,
    borderRadius: 42,
    backgroundColor: "rgba(221, 233, 255, 0.88)",
    paddingHorizontal: 40,
    paddingVertical: 24,
    gap: 16,
  },
  menuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: 18,
  },
  menuItemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
  menuLabel: {
    color: "#0D1727",
    fontSize: 23,
    lineHeight: 31,
    fontFamily: typography.family.base,
  },
  menuLabelActive: {
    fontWeight: typography.weight.bold,
  },
});
