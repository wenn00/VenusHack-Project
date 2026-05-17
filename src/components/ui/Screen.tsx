/**
 * Screen — standard page wrapper with safe area padding and themed background.
 */

import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";
import { AppMenuButton } from "./AppMenu";
import { BlueBackground } from "./BlueBackground";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  fixedOverlay?: React.ReactNode;
}

export function Screen({ children, scroll = true, contentStyle, fixedOverlay }: ScreenProps) {
  const Inner = (
    <View style={[styles.inner, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <BlueBackground />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {Inner}
        </ScrollView>
      ) : (
        Inner
      )}
      {fixedOverlay}
      <AppMenuButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.page,
    position: "relative",
  },
  scroll: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
});
