/**
 * Health log — placeholder.
 *
 * Will show a chronological merged timeline of BP, vitals, mood,
 * symptoms, and voice journal entries with a PDF export button.
 */

import { Body } from "@/components/ui/Body";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function HealthLogScreen() {
  return (
    <Screen>
      <Heading level={2}>Health log</Heading>
      <Body tone="muted">Everything you've tracked, in one place.</Body>

      <Card>
        <Heading level={3}>Timeline placeholder</Heading>
        <Body tone="muted">
          Entries will be merged from bp_readings, vitals_log, mood_entries,
          voice_journal_entries, and symptom_reports — sorted newest first.
        </Body>
      </Card>
    </Screen>
  );
}
