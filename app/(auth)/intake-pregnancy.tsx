/**
 * Pregnancy history intake — placeholder.
 *
 * Owner: teammate. Will collect stage, due date, and pregnancy
 * history conditions, then write to `pregnancy_history` in Supabase.
 */

import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function IntakePregnancyScreen() {
  return (
    <Screen>
      <Heading level={2}>Tell us about your journey</Heading>
      <Body tone="muted">
        A few quick questions so we can tailor your insights. Your
        answers stay private and only inform your own dashboard.
      </Body>

      <Card>
        <Heading level={3}>Pregnancy history</Heading>
        <Body tone="muted">
          Placeholder: form will collect stage, due date, prior
          preeclampsia, gestational hypertension, GDM, preterm birth.
        </Body>
      </Card>

      <Button label="Continue" onPress={() => router.push("/(auth)/intake-family")} />
    </Screen>
  );
}
