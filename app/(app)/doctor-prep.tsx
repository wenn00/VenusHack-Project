/**
 * Doctor visit prep — placeholder.
 *
 * Will compile the last 30 days of logs, generate a clinician-style
 * summary via Gemini, and offer to export it as a PDF for the visit.
 */

import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function DoctorPrepScreen() {
  return (
    <Screen>
      <Heading level={2}>Prepare for your visit</Heading>
      <Body tone="muted">
        Walk into your appointment with a clear picture of how you've been
        and the questions worth asking.
      </Body>

      <Card>
        <Heading level={3}>Summary placeholder</Heading>
        <Body tone="muted">
          Will display Gemini-generated summary preview before export.
        </Body>
      </Card>

      <Button label="Generate summary" onPress={() => {}} />
    </Screen>
  );
}
