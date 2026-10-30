/**
 * AI service (powered by ZotGPT — UCI's Portkey gateway in front of Azure OpenAI).
 *
 * The file is still named `gemini.ts` for backwards compatibility with
 * existing imports. The exported interface is identical:
 *   - chat(): conversational Q&A with user context
 *   - summarizeVoiceJournal(): turn a transcript into structured JSON
 *   - generateDoctorSummary(): build a clinician-ready 30-day summary
 *
 * Requests go through the `ai-chat` Supabase Edge Function
 * (supabase/functions/ai-chat), which holds the ZotGPT key server-side.
 * supabase-js attaches the signed-in user's session JWT automatically.
 */

import { FunctionsHttpError } from "@supabase/supabase-js";

import {
  DoctorSummary,
  normalizeDoctorSummary,
  normalizeVoiceJournalSummary,
} from "@/lib/ai-normalize";
import { userFacingAiMessage } from "@/lib/ai-errors";
import {
  buildChatSystemPrompt,
  ChatSystemContext,
  DOCTOR_SUMMARY_PROMPT,
  fillTemplate,
  VOICE_JOURNAL_PROMPT,
} from "@/lib/prompts";
import { supabase } from "@/services/supabase";
import { ChatMessage, VoiceJournalSummary } from "@/types";

export type { DoctorSummary } from "@/lib/ai-normalize";

/**
 * Thrown when the proxy refuses a call for a reason the user can act on
 * (no email sign-in, demo limit reached, gateway busy). Its message is safe
 * to show to the user, unlike other AI errors.
 */
export class AiAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiAccessError";
  }
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
  const { data, error } = await supabase.functions.invoke<{ content?: unknown }>("ai-chat", {
    body: {
      messages,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 800,
      jsonResponse: options.jsonResponse ?? false,
    },
  });

  if (error) {
    let code = "unknown_error";
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      code = payload?.error?.code ?? `http_${error.context.status}`;
    }
    const userMessage = userFacingAiMessage(code);
    if (userMessage) {
      throw new AiAccessError(userMessage);
    }
    // Keep the provider/proxy detail in the console; callers may show
    // the message to patients.
    console.warn("[ai] ai-chat call failed:", code, error);
    throw new Error("The AI service couldn't respond right now. Please try again in a moment.");
  }

  if (typeof data?.content !== "string") {
    throw new Error("The AI service returned an unexpected response.");
  }
  return data.content;
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
