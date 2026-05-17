import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme";

export function BlueBackground() {
  return (
    <View style={styles.root}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="topGlow" cx="18%" cy="28%" r="64%">
            <Stop offset="0%" stopColor={colors.bg.pageBright} stopOpacity="0.85" />
            <Stop offset="58%" stopColor={colors.bg.page} stopOpacity="0.22" />
            <Stop offset="100%" stopColor={colors.bg.pageDeep} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bottomGlow" cx="78%" cy="86%" r="58%">
            <Stop offset="0%" stopColor={colors.bg.pageBright} stopOpacity="0.9" />
            <Stop offset="54%" stopColor={colors.bg.page} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={colors.bg.pageDeep} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="centerDepth" cx="50%" cy="48%" r="72%">
            <Stop offset="0%" stopColor="#1F62D5" stopOpacity="0.34" />
            <Stop offset="100%" stopColor={colors.bg.pageDeep} stopOpacity="0.38" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.bg.page} />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
        <Rect width="100%" height="100%" fill="url(#centerDepth)" />
        <Rect width="100%" height="100%" fill="url(#bottomGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
});
