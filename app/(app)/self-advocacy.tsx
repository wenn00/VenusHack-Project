/**
 * Self-advocacy scripts — static placeholder content.
 *
 * Helps the user push back when a clinician dismisses concerns.
 */

import { Body } from "@/components/ui/Body";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

const TIPS = [
  {
    title: "If you feel dismissed",
    body: "Try: \"I understand you think it's nothing, but I want to be sure. Can we run a test to rule out preeclampsia?\"",
  },
  {
    title: "Asking for a specific test",
    body: "Try: \"Given my history of [condition], I'd like to request a 24-hour blood pressure monitor. What's the process to set that up?\"",
  },
  {
    title: "Phrases that get heard",
    body: "Instead of \"I just feel off,\" describe specifics: \"This headache lasted X hours and didn't respond to water or rest.\"",
  },
  {
    title: "When to escalate to the ER",
    body: "Severe headache, vision changes, severe swelling, chest pain, shortness of breath, or decreased fetal movement — go to the ER, don't wait for an OB appointment.",
  },
];

export default function SelfAdvocacyScreen() {
  return (
    <Screen>
      <Heading level={2}>How to advocate for yourself</Heading>
      <Body tone="muted">
        Your concerns are valid. These scripts are here when you need help putting words to them.
      </Body>
      {TIPS.map((t) => (
        <Card key={t.title}>
          <Heading level={3}>{t.title}</Heading>
          <Body>{t.body}</Body>
        </Card>
      ))}
    </Screen>
  );
}
