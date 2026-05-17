/**
 * Entry redirect. The actual routing decision lives in RootGate.
 * This screen just keeps the user on a neutral splash while we decide.
 */

import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { colors, typography } from "@/theme";

export default function Index() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 1100);

    return () => clearTimeout(timeout);
  }, []);

  function continueNow() {
    router.replace("/(auth)/login");
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
