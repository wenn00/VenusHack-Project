/**
 * Vitals detail — placeholder. Shows per-metric history.
 */

import { Body } from "@/components/ui/Body";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function VitalsScreen() {
  return (
    <Screen>
      <Heading level={2}>Vitals</Heading>
      <Card>
        <Heading level={3}>Trend charts go here</Heading>
        <Body tone="muted">
          Placeholder: per-metric cards (HR, BP, HRV, sleep) with 7-day trend lines.
        </Body>
      </Card>
    </Screen>
  );
}
