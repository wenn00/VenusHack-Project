/**
 * Entry redirect. The actual route gating lives in RootGate; this screen
 * shows a short brand splash, waits for the persisted session to load,
 * and forwards returning users straight into the app instead of forcing
 * a fresh OTP login on every launch.
 */

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { colors, typography } from "@/theme";

const SPLASH_MIN_MS = 1100;

export default function Index() {
  const { session, isLoading } = useAuth();
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMinDelayDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!minDelayDone || isLoading) return;
    // RootGate takes over from here (intake gating, etc.).
    router.replace(session ? "/(app)/dashboard" : "/(auth)/login");
  }, [minDelayDone, isLoading, session]);

  function continueNow() {
    if (isLoading) return;
    router.replace(session ? "/(app)/dashboard" : "/(auth)/login");
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <Pressable accessibilityRole="button" onPress={continueNow} style={styles.touchTarget}>
        <Text style={styles.brand}>Kairos</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 812,
    alignItems: "center",
    justifyContent: "center",
  },
  touchTarget: {
    minWidth: "100%",
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 50,
    lineHeight: 64,
  },
});
