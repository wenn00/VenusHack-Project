/**
 * The conference demo persona.
 *
 * Every anonymous demo visitor gets their own copy of "Maya": ~33 weeks
 * pregnant, a prior pregnancy with gestational hypertension and a family
 * history of high blood pressure. Together with the rising BP trend from
 * seed-demo.ts and the week of moods below, the app tells one consistent
 * preeclampsia-warning story without the visitor filling in any forms.
 *
 * Pure data and builders only — the writes live in seed-demo.ts.
 */

import { IntakeAnswers } from "@/lib/intake";
import { Mood } from "@/types/log";

const DAY_MS = 86_400_000;
const DUE_DATE_OFFSET_DAYS = 49;

export const DEMO_PERSONA_NAME = "Maya (Demo)";

/** Due date as YYYY-MM-DD (local calendar), seven weeks after `now`. */
export function demoDueDate(now: Date): string {
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DUE_DATE_OFFSET_DAYS);
  const month = String(due.getMonth() + 1).padStart(2, "0");
  const day = String(due.getDate()).padStart(2, "0");
  return `${due.getFullYear()}-${month}-${day}`;
}

export const DEMO_PREGNANCY_ANSWERS: IntakeAnswers = {
  had_preeclampsia: "No",
  had_gestational_hypertension: "Yes",
  had_gestational_diabetes: "No",
  had_preterm_birth: "No",
  had_eclampsia: "No",
  number_of_pregnancies: "2",
};

export const DEMO_FAMILY_ANSWERS: IntakeAnswers = {
  has_cvd_family: "No",
  has_stroke_family: "No",
  has_diabetes_family: "No",
  has_hypertension_family: "Yes",
};

/** Oldest first: a week drifting from great to low as the BP climbs. */
const MOOD_WEEK: { mood: Mood; note: string }[] = [
  { mood: "great", note: "Felt energetic, took a short walk after lunch." },
  { mood: "good", note: "Slept okay, a little tired." },
  { mood: "good", note: "Busy day at work, feeling fine." },
  { mood: "okay", note: "Mild headache in the afternoon." },
  { mood: "okay", note: "Ankles a bit swollen tonight." },
  { mood: "low", note: "Headache again and feeling anxious." },
  { mood: "low", note: "Puffy face this morning, worried about my blood pressure." },
];

export function demoMoodRows(
  userId: string,
  now: Date,
): { user_id: string; mood: Mood; note: string; logged_at: string }[] {
  return MOOD_WEEK.map((entry, index) => ({
    user_id: userId,
    mood: entry.mood,
    note: entry.note,
    logged_at: new Date(now.getTime() - (MOOD_WEEK.length - 1 - index) * DAY_MS).toISOString(),
  }));
}
