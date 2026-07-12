/**
 * KPIN red-flag alert. Modal-style screen pushed when an evaluation
 * comes back at the `red` level.
 *
 * Tone: warm, never panicky. Three clear next-step buttons.
 */

import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { getActiveAlert } from "@/lib/alert-store";
import { callOb } from "@/lib/linking";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing } from "@/theme";

export default function RedFlagScreen() {
  // Never render route params here: the kairos:// scheme would let an
  // external link put arbitrary text into this first-party medical alert.
  const activeAlert = getActiveAlert();

  const message = activeAlert?.message ?? "Let's slow down for a moment.";
  const detail =
    activeAlert?.detail ??
    "Something we tracked is outside the safe range during pregnancy. Let's figure out the next step together.";

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.spacer} />
      <Heading level={1} style={styles.title}>
        {message}
      </Heading>
      <Body size="lg" style={styles.detail}>
        {detail}
      </Body>

      <View style={styles.actions}>
        <Button label="Call my OB" onPress={() => callOb()} />
        <Button
          label="Go to ER"
          variant="secondary"
          onPress={() => router.push("/(app)/alert/emergency")}
        />
        <Button
          label="Show me what to say"
          variant="ghost"
          onPress={() => router.replace("/(app)/self-advocacy")}
        />
      </View>

      <Button
        label="I'm okay, dismiss"
        variant="ghost"
        onPress={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.status.redBg,
    justifyContent: "space-between",
  },
  spacer: { flex: 0.3 },
  title: {
    color: colors.status.red,
    textAlign: "center",
  },
  detail: {
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
