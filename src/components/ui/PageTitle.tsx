import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors, typography } from "@/theme";

/** Shared page heading; section headings continue to use Heading. */
export function PageTitle({ style, ...props }: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[styles.title, style]} />;
}

const styles = StyleSheet.create({
  title: {
    color: colors.fg.primary,
    fontFamily: typography.family.display,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "400",
  },
});
