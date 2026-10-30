import React from "react";
import { usePageTopPadding } from "@/hooks/usePageTopPadding";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

/** Place inside a safe area, outside page padding. No absolute inset math. */
export function BrandHeader() {
  const paddingTop = usePageTopPadding();
  return <View style={[styles.header, { paddingTop }]} pointerEvents="none">
    <Text style={styles.brand}>Kairos</Text>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingBottom: spacing.xl, alignItems: "center" },
  brand: {
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 24,
    lineHeight: 32,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
});
