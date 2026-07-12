/**
 * Normalization for LLM JSON output.
 *
 * Azure's json_object response format guarantees syntactically valid JSON,
 * NOT the requested schema. The previous code cast JSON.parse(text) straight
 * to the target type; a response missing one array field then threw a
 * TypeError in whichever screen called .length/.map on it — in the voice
 * journal, after the entry had already been saved.
 */

import { Mood, VoiceJournalSummary } from "@/types";

export interface DoctorSummary {
  patient_context: string[];
  vitals_summary: string[];
  symptom_summary: string[];
  mood_summary: string[];
  risk_factors: string[];
  questions_to_ask: string[];
  urgent_concerns: string[];
}

const MOODS: Mood[] = ["great", "good", "okay", "low", "bad"];

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeVoiceJournalSummary(raw: unknown): VoiceJournalSummary {
  const record = asRecord(raw);
  const mood = MOODS.find((m) => m === record.mood) ?? "okay";
  return {
    symptoms: stringArray(record.symptoms),
    mood,
    key_concerns: stringArray(record.key_concerns),
    red_flag_symptoms: stringArray(record.red_flag_symptoms),
    recommended_next_step:
      typeof record.recommended_next_step === "string" ? record.recommended_next_step : "",
  };
}

export function normalizeDoctorSummary(raw: unknown): DoctorSummary {
  const record = asRecord(raw);
  return {
    patient_context: stringArray(record.patient_context),
    vitals_summary: stringArray(record.vitals_summary),
    symptom_summary: stringArray(record.symptom_summary),
    mood_summary: stringArray(record.mood_summary),
    risk_factors: stringArray(record.risk_factors),
    questions_to_ask: stringArray(record.questions_to_ask),
    urgent_concerns: stringArray(record.urgent_concerns),
  };
}
