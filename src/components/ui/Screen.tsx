/**
 * Screen — standard page wrapper with safe area padding and themed background.
 */

import React, { useState } from "react";
import { screenTopPadding } from "@/lib/page-layout";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";
import { AppMenuButton } from "./AppMenu";
import { BlueBackground } from "./BlueBackground";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  scrollRef?: React.Ref<ScrollView>;
  contentStyle?: ViewStyle;
  fixedOverlay?: React.ReactNode;
  header?: React.ReactNode;
  /** Scroll content underneath the measured header; non-scrolling screens stay inline. */
  overlayHeader?: boolean;
  showMenu?: boolean;
}

export function Screen({ children, scroll = true, scrollRef, contentStyle, fixedOverlay, header, overlayHeader = false, showMenu = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const floatingHeader = overlayHeader && scroll && header != null;
  const topPadding = screenTopPadding(insets.top, contentStyle);
  const bottomPadding = Math.max(100, typeof contentStyle?.paddingBottom === "number" ? contentStyle.paddingBottom : 0) + insets.bottom;
  const Inner = (
    <View style={[styles.inner, contentStyle, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <BlueBackground />
      {!floatingHeader && header}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={floatingHeader && headerHeight === null ? styles.measuring : undefined}
          contentContainerStyle={[styles.scroll, floatingHeader && { paddingTop: headerHeight ?? 0 }]}
          keyboardShouldPersistTaps="handled"
        >
          {Inner}
        </ScrollView>
      ) : (
        Inner
      )}
      {floatingHeader && (
        <View
          pointerEvents="box-none"
          style={[styles.floatingHeader, { top: insets.top }]}
          onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}
        >
          {header}
        </View>
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
  measuring: { opacity: 0 },
  floatingHeader: { position: "absolute", left: 0, right: 0 },
  scroll: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
});
