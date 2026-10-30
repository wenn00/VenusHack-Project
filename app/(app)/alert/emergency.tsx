/**
 * Emergency action screen. Direct-action buttons only — no decoration,
 * no decisions.
 */

import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { callOb, openNearestErDirections, openUrlSafely } from "@/lib/linking";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/theme";

export default function EmergencyScreen() {
  return (
    <Screen contentStyle={styles.container}>
      <PageTitle>Emergency actions</PageTitle>
      <Body tone="muted">Pick whichever you need right now.</Body>

      <Button label="Call 911" onPress={() => void openUrlSafely("tel:911")} />
      <Button label="Call my OB" variant="secondary" onPress={() => callOb()} />
      <Button
        label="Directions to nearest ER"
        variant="secondary"
        onPress={() => openNearestErDirections()}
      />
      <Button
        label="Text a trusted person"
        variant="secondary"
        onPress={() => void openUrlSafely("sms:", "Couldn't open messages.")}
      />

      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
