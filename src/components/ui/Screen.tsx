/**
 * Screen — standard page wrapper with safe area padding and themed background.
 */

import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";
import { AppMenuButton } from "./AppMenu";
import { BlueBackground } from "./BlueBackground";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  fixedOverlay?: React.ReactNode;
  header?: React.ReactNode;
  showMenu?: boolean;
}

export function Screen({ children, scroll = true, contentStyle, fixedOverlay, header, showMenu = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(100, typeof contentStyle?.paddingBottom === "number" ? contentStyle.paddingBottom : 0) + insets.bottom;
  const Inner = (
    <View style={[styles.inner, contentStyle, { paddingBottom: bottomPadding }]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <BlueBackground />
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {Inner}
        </ScrollView>
      ) : (
        Inner
      )}
      {fixedOverlay}
      <AppMenuButton visible={showMenu} />
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.lg,
  },
});
