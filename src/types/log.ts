/**
 * Health log entry types: mood, symptoms, voice journal, chat.
 */

export type Mood = "great" | "good" | "okay" | "low" | "bad";

export interface MoodEntry {
  id: string;
  userId: string;
  mood: Mood;
  note: string | null;
  loggedAt: string;
}

export type SymptomKey =
  | "headache"
  | "swelling"
  | "shortness_of_breath"
  | "chest_pain"
  | "vision_changes"
  | "severe_abdominal_pain"
  | "decreased_fetal_movement"
  | "dizziness"
  | "fatigue"
  | "nausea";

export type SymptomSeverity = "mild" | "moderate" | "severe";

export interface SymptomReport {
  id: string;
  userId: string;
  symptoms: SymptomKey[];
  severity: SymptomSeverity | null;
  notes: string | null;
  reportedAt: string;
}

export interface VoiceJournalSummary {
  symptoms: string[];
  mood: Mood;
  key_concerns: string[];
  red_flag_symptoms: string[];
  recommended_next_step: string;
}

export interface VoiceJournalEntry {
  id: string;
  userId: string;
  rawTranscript: string;
  aiSummary: VoiceJournalSummary | null;
  recordedAt: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
