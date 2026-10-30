import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

/** Restore the original browser blur and fading blue tint, behind the text. */
export function FrostedHeaderBackground() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, backdrop]} />;
}

const backdrop = {
  backgroundColor: "rgba(23, 80, 172, 0.18)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  maskImage: "linear-gradient(to bottom, black 0%, black 54%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 54%, transparent 100%)",
} as ViewStyle;
