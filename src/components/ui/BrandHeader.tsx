import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

/** Place inside a safe area, outside page padding. No absolute inset math. */
export function BrandHeader() {
  return <View style={styles.header} pointerEvents="none">
    <Text style={styles.brand}>Kairos</Text>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xxxl, paddingBottom: spacing.xl, alignItems: "center" },
  brand: {
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 24,
    lineHeight: 32,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
});
