import { Platform } from "react-native";

const baseFamily = Platform.select({
  ios: "System",
  android: "Roboto",
  default: "System",
}) as string;

export const typography = {
  family: {
    base: baseFamily,
    display: baseFamily,
    brand: "PracticesCollectionDemo",
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;
