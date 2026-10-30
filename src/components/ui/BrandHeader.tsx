import React from "react";
import { FrostedHeaderBackground } from "./FrostedHeaderBackground";
import { usePageTopPadding } from "@/hooks/usePageTopPadding";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

/** Place inside a safe area, outside page padding. No absolute inset math. */
export function BrandHeader({ bottomSpacing = spacing.xl, frosted = false }: { bottomSpacing?: number; frosted?: boolean }) {
  const paddingTop = usePageTopPadding();
  return <View style={[styles.header, { paddingTop, paddingBottom: bottomSpacing }]} pointerEvents="none">
    {frosted && <FrostedHeaderBackground />}
    <Text style={styles.brand}>Kairos</Text>
  </View>;
}

const styles = StyleSheet.create({
  header: { alignItems: "center" },
  brand: {
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 24,
    lineHeight: 32,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
});
