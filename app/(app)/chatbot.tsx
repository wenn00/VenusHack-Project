/**
 * AI Chatbot — placeholder.
 *
 * Will hold a Gemini-backed conversation, with the user's pregnancy
 * and family history fed into the system prompt for personalised
 * answers. Always shows a disclaimer.
 */

import { Body } from "@/components/ui/Body";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";

export default function ChatbotScreen() {
  return (
    <Screen>
      <Heading level={2}>Ask Kairos</Heading>
      <Body tone="muted">
        I'm here to answer questions about your pregnancy and heart health.
      </Body>

      <Card>
        <Heading level={3}>Chat thread placeholder</Heading>
        <Body tone="muted">
          Message bubbles + input bar will live here. Voice input via the
          iOS keyboard microphone is supported automatically.
        </Body>
      </Card>

      <Body tone="muted" size="sm">
        I'm an AI assistant. Always consult your healthcare provider for
        medical decisions.
      </Body>
    </Screen>
  );
}
