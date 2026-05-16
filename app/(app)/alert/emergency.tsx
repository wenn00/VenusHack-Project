/**
 * Emergency action screen. Direct-action buttons only — no decoration,
 * no decisions.
 */

import { Linking, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/theme";

export default function EmergencyScreen() {
  return (
    <Screen contentStyle={styles.container}>
      <Heading level={2}>Emergency actions</Heading>
      <Body tone="muted">Pick whichever you need right now.</Body>

      <Button label="Call 911" onPress={() => Linking.openURL("tel:911")} />
      <Button
        label="Call my OB"
        variant="secondary"
        onPress={() => Linking.openURL("tel:")}
      />
      <Button
        label="Directions to nearest ER"
        variant="secondary"
        onPress={() => Linking.openURL("https://maps.apple.com/?q=emergency+room")}
      />
      <Button
        label="Text a trusted person"
        variant="secondary"
        onPress={() => Linking.openURL("sms:")}
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
