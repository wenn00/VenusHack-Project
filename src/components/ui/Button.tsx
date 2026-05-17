import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "@/theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", disabled, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: {
    backgroundColor: colors.accent.blueSoft,
    borderColor: colors.border.faint,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: colors.border.default,
  },
  ghost: {
    backgroundColor: "transparent",
    minHeight: 32,
    paddingVertical: spacing.xs,
    borderColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: typography.size.md,
    lineHeight: 24,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },
  primaryLabel: { color: colors.fg.onAccent },
  secondaryLabel: { color: colors.fg.primary },
  ghostLabel: {
    color: colors.fg.primary,
    fontWeight: typography.weight.regular,
    textDecorationLine: "underline",
  },
});
