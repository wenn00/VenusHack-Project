/**
 * Gemini service.
 *
 * Three tasks:
 *   - chat(): conversational Q&A with user context
 *   - summarizeVoiceJournal(): turn a transcript into structured JSON
 *   - generateDoctorSummary(): build a clinician-ready 30-day summary
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildChatSystemPrompt,
  ChatSystemContext,
  DOCTOR_SUMMARY_PROMPT,
  VOICE_JOURNAL_PROMPT,
} from "@/lib/prompts";
import { ChatMessage, VoiceJournalSummary } from "@/types";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[gemini] Missing EXPO_PUBLIC_GEMINI_API_KEY in .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey ?? "");
const MODEL_ID = "gemini-2.0-flash-exp";

export async function chat(
  userMessage: string,
  history: ChatMessage[],
  ctx: ChatSystemContext,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: buildChatSystemPrompt(ctx),
  });

  const session = model.startChat({
    history: history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
  });

  const result = await session.sendMessage(userMessage);
  return result.response.text();
}

export async function summarizeVoiceJournal(transcript: string): Promise<VoiceJournalSummary> {
  const model = genAI.getGenerativeModel({ model: MODEL_ID });

  const prompt = VOICE_JOURNAL_PROMPT.replace("{transcript}", transcript);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = result.response.text();
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
  const model = genAI.getGenerativeModel({ model: MODEL_ID });

  const prompt = DOCTOR_SUMMARY_PROMPT.replace("{data_json}", JSON.stringify(data));

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  return JSON.parse(result.response.text()) as DoctorSummary;
}
