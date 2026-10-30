import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/** Native backdrop only: keep the brand text outside the fading mask. */
export function FrostedHeaderBackground() {
  const { top } = useSafeAreaInsets();
  return (
    <MaskedView
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { top: -top }]}
      maskElement={
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="headerFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="black" stopOpacity={1} />
              <Stop offset="54%" stopColor="black" stopOpacity={1} />
              <Stop offset="100%" stopColor="black" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#headerFade)" />
        </Svg>
      }
    >
      <BlurView intensity={30} tint="default" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  tint: { backgroundColor: "rgba(23, 80, 172, 0.18)" },
});
