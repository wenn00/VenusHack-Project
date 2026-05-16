/**
 * Gemini prompt templates.
 * Keep them centralized so we can tune wording without hunting through screens.
 */

import { UserProfile, PregnancyHistory, FamilyHistory, BpReading, MoodEntry } from "@/types";

export interface ChatSystemContext {
  profile: UserProfile | null;
  pregnancyHistory: PregnancyHistory | null;
  familyHistory: FamilyHistory | null;
  recentBp: BpReading[];
  recentMood: MoodEntry[];
}

export function buildChatSystemPrompt(ctx: ChatSystemContext): string {
  const stage = ctx.profile?.stage ?? "not_specified";
  const pregLine = ctx.pregnancyHistory
    ? listConditions(ctx.pregnancyHistory)
    : "none reported";
  const famLine = ctx.familyHistory
    ? listFamilyConditions(ctx.familyHistory)
    : "none reported";
  const bpLine =
    ctx.recentBp.length === 0
      ? "no recent BP readings"
      : ctx.recentBp
          .slice(0, 5)
          .map((b) => `${b.systolic}/${b.diastolic} on ${b.measuredAt.slice(0, 10)}`)
          .join(", ");
  const moodLine =
    ctx.recentMood.length === 0
      ? "no recent mood entries"
      : ctx.recentMood
          .slice(0, 5)
          .map((m) => `${m.mood} on ${m.loggedAt.slice(0, 10)}`)
          .join(", ");

  return `You are a warm, knowledgeable health assistant for pregnant and postpartum women, specialized in cardiovascular health.

User context:
- Pregnancy stage: ${stage}
- Pregnancy history: ${pregLine}
- Family history: ${famLine}
- Recent BP readings: ${bpLine}
- Recent mood: ${moodLine}

Guidelines:
1. Be warm and supportive, never dismissive.
2. Use plain language. Avoid medical jargon unless explained.
3. ALWAYS recommend consulting a healthcare provider for diagnosis or treatment.
4. If the user describes severe symptoms (chest pain, severe headache, vision changes, severe swelling, shortness of breath, decreased fetal movement), recommend contacting their OB or going to the ER immediately.
5. Validate their feelings. Many women face medical gaslighting; be the assistant who takes their concerns seriously.
6. Keep responses concise (3-5 sentences) unless they ask for detail.
7. NEVER claim to diagnose. Use language like "this could be" or "it might help to".`;
}

export const VOICE_JOURNAL_PROMPT = `You will receive a voice journal transcript from a pregnant or postpartum woman.
Extract structured health information.

Return ONLY valid JSON in this exact shape:
{
  "symptoms": [string],
  "mood": "great" | "good" | "okay" | "low" | "bad",
  "key_concerns": [string],
  "red_flag_symptoms": [string],
  "recommended_next_step": string
}

Red flag symptoms include: chest pain, severe headache, vision changes, severe swelling,
shortness of breath, decreased fetal movement, severe abdominal pain.

Transcript:
{transcript}`;

export const DOCTOR_SUMMARY_PROMPT = `You will receive a pregnant woman's health log from the past 30 days. Generate a clinical summary in the style a clinician would appreciate. Focus on:
1. BP trends and concerning readings
2. Symptom patterns
3. Mood patterns relevant to perinatal mental health
4. rPPG readings (note these are estimates, not clinical-grade)
5. Risk factors from pregnancy and family history

Then generate:
- 3-5 specific questions she should ask her doctor
- Any urgent concerns (red flag patterns)

Return ONLY valid JSON in this exact shape:
{
  "patient_context": string,
  "vitals_summary": string,
  "symptom_summary": string,
  "mood_summary": string,
  "risk_factors": [string],
  "questions_to_ask": [string],
  "urgent_concerns": [string]
}

Data:
{data_json}`;

// ---- helpers --------------------------------------------------------

function listConditions(h: PregnancyHistory): string {
  const parts: string[] = [];
  if (h.hadPreeclampsia) parts.push("preeclampsia");
  if (h.hadGestationalHypertension) parts.push("gestational hypertension");
  if (h.hadGestationalDiabetes) parts.push("gestational diabetes");
  if (h.hadPretermBirth) parts.push("preterm birth");
  if (h.hadEclampsia) parts.push("eclampsia");
  return parts.length > 0 ? parts.join(", ") : "none reported";
}

function listFamilyConditions(h: FamilyHistory): string {
  const parts: string[] = [];
  if (h.hasCvdFamily) parts.push("CVD in first-degree relative");
  if (h.hasStrokeFamily) parts.push("stroke in family");
  if (h.hasDiabetesFamily) parts.push("diabetes in family");
  if (h.hasHypertensionFamily) parts.push("hypertension in family");
  return parts.length > 0 ? parts.join(", ") : "none reported";
}
