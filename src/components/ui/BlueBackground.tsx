import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors } from "@/theme";

/** Local Figma artwork, rasterized from the original SVGs for native support. */
export function BlueBackground() {
  const [size, setSize] = useState({ width: 440, height: 956 });
  const scale = Math.max(size.width / 440, size.height / 956);
  const offsetX = (size.width - 440 * scale) / 2;
  const offsetY = (size.height - 956 * scale) / 2;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={styles.root}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
    >
      <View style={{ position: "absolute", width: 1192.26 * scale, height: 1123.83 * scale,
          left: offsetX - 391.13 * scale, top: offsetY - 130 * scale,
          transform: [{ rotate: "-154.28deg" }], mixBlendMode: "overlay" }}>
        <Image source={require("../../../assets/figma/background-glow.png")} style={styles.image} />
      </View>
      <View style={{ position: "absolute", width: 1631.7 * scale, height: 1629.4 * scale,
          left: offsetX - 1105 * scale, top: offsetY - 474 * scale,
          transform: [{ rotate: "110.53deg" }, { scaleX: -1 }], mixBlendMode: "color-dodge" }}>
        <Image source={require("../../../assets/figma/background-light.png")} style={styles.image} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden", backgroundColor: colors.bg.page },
});
