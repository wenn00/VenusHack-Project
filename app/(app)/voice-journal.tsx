/**
 * Voice Journal — placeholder.
 *
 * Will use expo-speech-recognition to capture a transcript, send it to
 * Gemini for structured summarisation, and persist both the transcript
 * and the summary to `voice_journal_entries`.
 */

import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function VoiceJournalScreen() {
  return (
    <Screen>
      <Heading level={2}>Voice journal</Heading>
      <Body tone="muted">
        Speak freely. We'll transcribe what you say and pull out the
        important parts — symptoms, mood, things worth telling your doctor.
      </Body>

      <Card>
        <Heading level={3}>Microphone placeholder</Heading>
        <Body tone="muted">
          Tap-to-record button + live transcript will live here.
        </Body>
      </Card>

      <Button label="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
