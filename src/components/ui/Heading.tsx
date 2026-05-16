import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { colors, typography } from "@/theme";

interface HeadingProps extends TextProps {
  level?: 1 | 2 | 3;
  children: React.ReactNode;
}

export function Heading({ level = 1, style, children, ...rest }: HeadingProps) {
  return (
    <Text style={[styles.base, styles[`h${level}`], style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.fg.primary,
    fontWeight: typography.weight.bold,
  },
  h1: {
    fontSize: typography.size.xxxl,
  },
  h2: {
    fontSize: typography.size.xxl,
  },
  h3: {
    fontSize: typography.size.lg,
  },
});
