import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { colors, spacing, typography } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const menuItems: { label: string; icon: IconName; href: string; route: string }[] = [
  { label: "Log Vitals", icon: "list-outline", href: "/(app)/log-bp", route: "log-bp" },
  { label: "Mood Tracker", icon: "happy-outline", href: "/(app)/log-mood", route: "log-mood" },
  { label: "Chatbot", icon: "chatbox-outline", href: "/(app)/chatbot", route: "chatbot" },
  { label: "Vitals Overview", icon: "heart-outline", href: "/(app)/vitals", route: "vitals" },
  { label: "Appointment Prep", icon: "calendar-outline", href: "/(app)/appointments", route: "appointments" },
  { label: "Voice Journal", icon: "mic-outline", href: "/(app)/voice-journal", route: "voice-journal" },
  { label: "Resources", icon: "bookmark-outline", href: "/(app)/community", route: "community" },
  { label: "History", icon: "time-outline", href: "/(app)/health-log", route: "health-log" },
  { label: "Test Heart Rate", icon: "camera-outline", href: "/(app)/camera-rppg", route: "camera-rppg" },
  { label: "Update health profile", icon: "person-outline", href: "/(auth)/intake-basic", route: "intake-basic" },
  { label: "Homepage", icon: "home-outline", href: "/(app)/dashboard", route: "dashboard" },
];

export function AppMenuButton() {
  const segments = useSegments();
  const { signOut } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signingOutRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const currentRoute = segments[segments.length - 1];
  if (segments[0] !== "(app)") return null;

  function close() { if (!signingOutRef.current) setIsOpen(false); }
  async function handleSignOut() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      setIsOpen(false);
      router.replace("/(auth)/login");
    } catch {
      setError("Couldn't sign out. Please check your connection and try again.");
    } finally {
      signingOutRef.current = false;
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Open menu"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => { setError(null); setIsOpen(true); }}
        style={({ pressed }) => [styles.menuButton, { bottom: 20 + insets.bottom }, pressed && styles.pressed]}>
        <Ionicons name="menu" size={32} color={colors.fg.primary} />
      </Pressable>
      <Modal visible={isOpen} animationType="fade" transparent onRequestClose={close}>
        <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close menu" />
          <View accessibilityViewIsModal style={[styles.panel, { maxHeight: Math.max(160, height - insets.top - insets.bottom - 40) }]}>
            <View style={styles.header}>
              <Text style={styles.heading}>Explore Kairos</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close menu" disabled={isSigningOut} onPress={close} style={styles.close}>
                <Ionicons name="close" size={24} color="#172D52" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.items}>
              {menuItems.map((item) => {
                const active = currentRoute === item.route;
                return (
                  <Pressable key={item.route} accessibilityRole="button" accessibilityState={{ selected: active, disabled: isSigningOut }}
                    disabled={isSigningOut}
                    onPress={() => { setIsOpen(false); if (!active) router.navigate(item.href as Parameters<typeof router.navigate>[0]); }}
                    style={({ pressed }) => [styles.menuItem, active && styles.active, pressed && styles.pressed]}>
                    <Ionicons name={item.icon} size={25} color="#172D52" />
                    <Text style={[styles.menuLabel, active && styles.activeLabel]}>{item.label}</Text>
                  </Pressable>
                );
              })}
              <View style={styles.divider} />
              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSigningOut }} disabled={isSigningOut}
                onPress={handleSignOut} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
                <Ionicons name="log-out-outline" size={25} color="#172D52" />
                <Text style={styles.menuLabel}>{isSigningOut ? "Signing out…" : "Sign out"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  menuButton: { position: "absolute", left: 22, zIndex: 20, width: 52, height: 52,
    borderRadius: 26, backgroundColor: "rgba(15, 57, 133, 0.8)", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, backgroundColor: "rgba(8, 42, 113, 0.55)", justifyContent: "flex-end", paddingHorizontal: 22 },
  panel: { width: "100%", maxWidth: 340, borderRadius: 32, overflow: "hidden", backgroundColor: "rgba(221, 233, 255, 0.97)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 24, paddingRight: 12, paddingTop: 8 },
  heading: { fontSize: 14, fontWeight: "600", color: "#435B7C" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  items: { paddingHorizontal: 14, paddingBottom: 16, gap: 4 },
  menuItem: { minHeight: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: spacing.md, borderRadius: 16 },
  menuLabel: { flex: 1, color: "#172D52", fontSize: 18, lineHeight: 26, fontFamily: typography.family.base },
  active: { backgroundColor: "rgba(255, 255, 255, 0.5)" },
  activeLabel: { fontWeight: typography.weight.bold },
  divider: { height: 1, backgroundColor: "rgba(23,45,82,0.12)", marginVertical: 8 },
  error: { color: "#9C271D", fontSize: 14, lineHeight: 20, paddingHorizontal: 12 },
});
