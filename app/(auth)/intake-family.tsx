/**
 * Family history intake — placeholder.
 *
 * Owner: teammate. Will collect first-degree relative history of
 * CVD, stroke, diabetes, hypertension, then write to `family_history`.
 */

import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function IntakeFamilyScreen() {
  return (
    <Screen>
      <Heading level={2}>Family health history</Heading>
      <Body tone="muted">
        Heart conditions can run in families. Knowing this helps Kairos
        spot patterns earlier.
      </Body>

      <Card>
        <Heading level={3}>First-degree relatives</Heading>
        <Body tone="muted">
          Placeholder: form will collect CVD, stroke, diabetes, hypertension.
        </Body>
      </Card>

      <Button label="Done" onPress={() => router.replace("/(app)/dashboard")} />
    </Screen>
  );
}
