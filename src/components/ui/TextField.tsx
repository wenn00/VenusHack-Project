import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing, typography } from "@/theme";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function TextField({
  label,
  required,
  containerStyle,
  inputStyle,
  placeholderTextColor = colors.fg.placeholder,
  ...inputProps
}: TextFieldProps) {
  return (
    <View style={[styles.root, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      )}
      <TextInput
        {...inputProps}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, inputProps.multiline && styles.multiline, inputStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    color: colors.fg.primary,
    fontSize: typography.size.md,
    lineHeight: 24,
    fontWeight: typography.weight.medium,
  },
  required: {
    color: "#FEF2F2",
    fontSize: typography.size.xs,
    lineHeight: 14,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.bg.input,
    color: colors.fg.primary,
    fontSize: typography.size.md,
    lineHeight: 24,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});
