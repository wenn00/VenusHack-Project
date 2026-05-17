/**
 * AI service (powered by ZotGPT — UCI's Azure OpenAI proxy).
 *
 * The file is still named `gemini.ts` for backwards compatibility with
 * existing imports. The exported interface is identical:
 *   - chat(): conversational Q&A with user context
 *   - summarizeVoiceJournal(): turn a transcript into structured JSON
 *   - generateDoctorSummary(): build a clinician-ready 30-day summary
 *
 * Uses the Azure OpenAI Chat Completions REST API directly (no SDK).
 * Plain fetch keeps the bundle small and avoids the openai package's
 * Node.js assumptions that break in React Native.
 */

import {
  buildChatSystemPrompt,
  ChatSystemContext,
  DOCTOR_SUMMARY_PROMPT,
  VOICE_JOURNAL_PROMPT,
} from "@/lib/prompts";
import { ChatMessage, VoiceJournalSummary } from "@/types";

const apiKey = process.env.EXPO_PUBLIC_ZOTGPT_API_KEY;
const endpoint = process.env.EXPO_PUBLIC_ZOTGPT_ENDPOINT;
const deployment = process.env.EXPO_PUBLIC_ZOTGPT_DEPLOYMENT;
const apiVersion = process.env.EXPO_PUBLIC_ZOTGPT_API_VERSION ?? "2024-10-21";

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

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const body: Record<string, unknown> = {
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
      "api-key": apiKey,
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
  const prompt = VOICE_JOURNAL_PROMPT.replace("{transcript}", transcript);
  const text = await callZotGpt(
    [{ role: "user", content: prompt }],
    { temperature: 0.3, maxTokens: 1000, jsonResponse: true },
  );
  return JSON.parse(text) as VoiceJournalSummary;
}

export interface DoctorSummary {
  patient_context: string;
  vitals_summary: string;
  symptom_summary: string;
  mood_summary: string;
  risk_factors: string[];
  questions_to_ask: string[];
  urgent_concerns: string[];
}

export async function generateDoctorSummary(data: unknown): Promise<DoctorSummary> {
  const prompt = DOCTOR_SUMMARY_PROMPT.replace("{data_json}", JSON.stringify(data));
  const text = await callZotGpt(
    [{ role: "user", content: prompt }],
    { temperature: 0.2, maxTokens: 2000, jsonResponse: true },
  );
  return JSON.parse(text) as DoctorSummary;
}
