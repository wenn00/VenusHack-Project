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

RESPONSE STYLE — strict rules:
- Reply like a text message from a knowledgeable friend: short, warm, conversational.
- HARD LIMIT: 3-4 sentences total unless the user explicitly asks "tell me more" or "in detail".
- NO markdown formatting. Do NOT use **bold**, asterisks, bullet points, numbered lists, or headers. Plain prose only.
- If you need to list things, write them inline: "Try resting, drinking water, and lying on your left side."
- For red-flag symptoms (chest pain, severe headache, vision changes, severe swelling, shortness of breath, decreased fetal movement), open with a clear "Please call your OB or go to the ER now." and keep the rest very brief.

CONTENT GUIDELINES:
- Be warm and supportive, never dismissive.
- Plain language. No medical jargon unless explained inline.
- Always recommend consulting a healthcare provider, but don't make it the whole reply.
- Validate her feelings. Many women face medical gaslighting; take her concerns seriously.
- NEVER claim to diagnose. Use language like "this could be" or "it might help to".`;
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

export const DOCTOR_SUMMARY_PROMPT = `You are writing a ONE-PAGE clinical pre-visit summary for an OB / midwife.
The clinician will scan it in 30 seconds. Density matters more than completeness.

STYLE — strict:
- HARD LIMIT: 18 words per bullet. Aim for 8-15.
- One sentence per bullet. No semicolons chaining clauses.
- Telegraphic clinical shorthand: drop articles, use abbreviations (BP, HR, GA, OB, sx, pt).
- Use compressed dates: "5/17 09:12" not "2026-05-17 at 09:12 AM".
- Don't repeat context across bullets. If you said "on 5/17" once, drop it from sibling bullets.
- Skip filler entirely: no "As we can see", "Of note", "It is important to", "This is concerning because", "warrants", "suggests".
- Don't restate the raw BP / mood tables; interpret patterns and outliers only.
- rPPG values are estimates — say "rPPG" when citing them.

LENGTH CAPS (must fit on ONE printed page — fewer is fine, more is not):
- patient_context:  max 2 bullets
- vitals_summary:   max 2 bullets
- symptom_summary:  max 4 bullets, one per distinct symptom
- mood_summary:     max 1 bullet
- risk_factors:     max 2 bullets
- questions_to_ask: 3-4 bullets
- urgent_concerns:  max 2 bullets, or [] if no red-flag pattern

QUESTIONS_TO_ASK perspective — IMPORTANT:
These are questions the PATIENT asks her PROVIDER. First person from the patient's POV.
Examples of correct phrasing:
- "Could this headache + swelling be early preeclampsia? What tests can we run today?"
- "How often should I measure BP at home, and what numbers should trigger a call?"
- "Are my dizziness episodes safe to monitor, or do I need a neuro eval?"
Wrong (do NOT do this):
- "Can you clarify your symptoms?" — that's the doctor asking the patient.

If a section has no signal, return [].

Return ONLY valid JSON in exactly this shape:
{
  "patient_context": [string],
  "vitals_summary": [string],
  "symptom_summary": [string],
  "mood_summary": [string],
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
