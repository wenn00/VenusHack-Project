import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors, typography } from "@/theme";

type Tone = "default" | "muted" | "accent";

interface BodyProps extends TextProps {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Body({ tone = "default", size = "md", style, children, ...rest }: BodyProps) {
  return (
    <Text style={[styles.base, styles[tone], styles[size], style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    lineHeight: 24,
  },
  default: { color: colors.fg.primary },
  muted: { color: colors.fg.muted },
  accent: { color: colors.fg.primary },
  sm: { fontSize: typography.size.sm, lineHeight: 20 },
  md: { fontSize: typography.size.md, lineHeight: 24 },
  lg: { fontSize: typography.size.lg, lineHeight: 28 },
});
