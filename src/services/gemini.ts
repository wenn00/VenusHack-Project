/**
 * AI service (powered by ZotGPT — UCI's Portkey gateway in front of Azure OpenAI).
 *
 * The file is still named `gemini.ts` for backwards compatibility with
 * existing imports. The exported interface is identical:
 *   - chat(): conversational Q&A with user context
 *   - summarizeVoiceJournal(): turn a transcript into structured JSON
 *   - generateDoctorSummary(): build a clinician-ready 30-day summary
 *
 * Uses the gateway's OpenAI-compatible Chat Completions REST API directly
 * (no SDK). Plain fetch keeps the bundle small and avoids the openai
 * package's Node.js assumptions that break in React Native.
 */

import {
  DoctorSummary,
  normalizeDoctorSummary,
  normalizeVoiceJournalSummary,
} from "@/lib/ai-normalize";
import {
  buildChatSystemPrompt,
  ChatSystemContext,
  DOCTOR_SUMMARY_PROMPT,
  fillTemplate,
  VOICE_JOURNAL_PROMPT,
} from "@/lib/prompts";
import { ChatMessage, VoiceJournalSummary } from "@/types";

export type { DoctorSummary } from "@/lib/ai-normalize";

const apiKey = process.env.EXPO_PUBLIC_ZOTGPT_API_KEY;
const endpoint = process.env.EXPO_PUBLIC_ZOTGPT_ENDPOINT;
// Gateway model slug, e.g. "@zotgpt-api-azure/gpt-4o".
const deployment = process.env.EXPO_PUBLIC_ZOTGPT_DEPLOYMENT;

if (!apiKey || !endpoint || !deployment) {
  console.warn(
    "[ai] Missing ZotGPT config. Set EXPO_PUBLIC_ZOTGPT_API_KEY, " +
      "EXPO_PUBLIC_ZOTGPT_ENDPOINT, and EXPO_PUBLIC_ZOTGPT_DEPLOYMENT in .env.local.",
  );
}

interface AzureChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonResponse?: boolean;
}

async function callZotGpt(
  messages: AzureChatMessage[],
  options: CallOptions = {},
): Promise<string> {
  if (!apiKey || !endpoint || !deployment) {
    throw new Error(
      "ZotGPT is not configured. Add EXPO_PUBLIC_ZOTGPT_* values to .env.local and restart Expo.",
    );
  }

  const url = `${endpoint.replace(/\/+$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: deployment,
    messages,
    temperature: options.temperature ?? 0.7,
    // Newer Azure OpenAI deployments (GPT-4o, o-series, etc.) require
    // `max_completion_tokens` instead of the deprecated `max_tokens`.
    max_completion_tokens: options.maxTokens ?? 800,
  };
  if (options.jsonResponse) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`ZotGPT ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("ZotGPT returned an unexpected response shape");
  }
  return content;
}

// ---- public API -----------------------------------------------------

export async function chat(
  userMessage: string,
  history: ChatMessage[],
  ctx: ChatSystemContext,
): Promise<string> {
  const messages: AzureChatMessage[] = [
    { role: "system", content: buildChatSystemPrompt(ctx) },
    ...history.map<AzureChatMessage>((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // Keep replies short — the system prompt enforces this, but a hard
  // token cap prevents long-winded answers slipping through.
  const reply = await callZotGpt(messages, { temperature: 0.7, maxTokens: 220 });
  return reply.trim();
}

export async function summarizeVoiceJournal(transcript: string): Promise<VoiceJournalSummary> {
  const prompt = fillTemplate(VOICE_JOURNAL_PROMPT, "{transcript}", transcript);
  const text = await callZotGpt(
    [{ role: "user", content: prompt }],
    { temperature: 0.3, maxTokens: 1000, jsonResponse: true },
  );
  // json_object guarantees valid JSON, not the requested schema — normalize
  // so missing fields cannot crash screens after a successful save.
  return normalizeVoiceJournalSummary(JSON.parse(text));
}

export async function generateDoctorSummary(data: unknown): Promise<DoctorSummary> {
  const prompt = fillTemplate(DOCTOR_SUMMARY_PROMPT, "{data_json}", JSON.stringify(data));
  const text = await callZotGpt(
    [{ role: "user", content: prompt }],
    { temperature: 0.2, maxTokens: 2000, jsonResponse: true },
  );
  return normalizeDoctorSummary(JSON.parse(text));
}
