import { PregnancyStage } from "@/types/user";

export type IntakeAnswers = Record<string, string>;
export interface IntakeQuestion {
  key: string;
  label: string;
  choices?: readonly string[];
  placeholder?: string;
  number?: { min: number; max: number; integer?: boolean };
}
export interface IntakeSection { title: string; questions: IntakeQuestion[] }
export const YES_NO = ["Yes", "No", "Not sure", "Prefer not to answer"] as const;
const q = (key: string, label: string): IntakeQuestion => ({ key, label, choices: YES_NO });
const text = (key: string, label: string, placeholder = "Optional"): IntakeQuestion => ({ key, label, placeholder });
const number = (key: string, label: string, min: number, max: number, integer = false): IntakeQuestion => ({ key, label, number: { min, max, integer }, placeholder: "Optional" });

export const HISTORY_QUESTIONS = [
  q("had_preeclampsia", "Have you ever had preeclampsia?"),
  q("had_gestational_hypertension", "Have you ever had gestational hypertension?"),
  q("had_gestational_diabetes", "Have you ever had gestational diabetes?"),
  q("had_preterm_birth", "Have you ever had a preterm birth?"),
  q("had_eclampsia", "Have you ever had eclampsia?"),
];
export const FAMILY_QUESTIONS = [
  q("has_cvd_family", "Does heart disease run in your immediate family?"),
  q("has_stroke_family", "Has an immediate family member had a stroke?"),
  q("has_diabetes_family", "Does diabetes run in your immediate family?"),
  q("has_hypertension_family", "Does high blood pressure run in your immediate family?"),
  q("early_heart_attack_stroke", "Has an immediate family member had a heart attack or stroke before age 65?"),
  q("female_pregnancy_complications", "Has a female relative had pregnancy complications such as preeclampsia, stroke or heart problems?"),
];

export function pregnancySections(stage: PregnancyStage): IntakeSection[] {
  const basics: IntakeSection = { title: "Just getting a couple more facts", questions: [
    text("race_ethnicity", "What is your race / ethnicity?", "Describe in your own words"),
    number("height_cm", "What is your height? (cm)", 50, 250),
    number("weight_kg", "What is your current weight? (kg)", 20, 500),
    text("care_provider", "Where do you receive care?", "Clinic, health system or provider"),
    text("doctor", "Do you have a primary care doctor or OB/GYN?", "Doctor's name, or leave blank"),
    text("diagnoses", "Have you been diagnosed with any health conditions?", "List any diagnoses you want to share"),
  ] };
  let sections: IntakeSection[];
  if (stage === "planning") {
    sections = [{ title: "We’re happy to be on this journey with you", questions: [
      q("previous_pregnancy", "Have you ever been pregnant before?"),
      number("number_of_pregnancies", "How many pregnancies have you had?", 0, 30, true),
      text("previous_complications", "If you have been pregnant, did you experience any complications?"),
      q("high_blood_pressure", "Do you have high blood pressure?"),
      q("nicotine", "Do you currently smoke, vape or use nicotine?"),
      { key: "activity", label: "How would you describe your activity level?", choices: ["Mostly seated", "Lightly active", "Moderately active", "Very active", "Not sure", "Prefer not to answer"] },
    ] }];
  } else if (stage === "postpartum") {
    sections = [{ title: "Your birth and recovery", questions: [
      { key: "birth_method", label: "How did you give birth?", choices: ["Vaginal birth", "Cesarean birth", "Prefer not to answer"] },
      text("delivery_complications", "Did you experience any complications during pregnancy or delivery?"),
      q("high_risk", "Was your pregnancy considered high risk?"),
      number("number_of_pregnancies", "How many pregnancies have you had?", 0, 30, true),
    ] }, { title: "Current health status", questions: [
      q("postpartum_checkup", "Have you had your postpartum checkup yet?"),
      q("heart_health_discussed", "At that visit, did your doctor discuss your blood pressure or heart health?"),
      q("breastfeeding", "Are you currently breastfeeding?"),
      text("medications", "Are you currently taking any medications?", "Names, or none"),
      q("bp_checked", "Has your blood pressure been checked since giving birth?"),
      q("bp_cuff", "Do you have a blood pressure cuff at home?"),
      text("current_symptoms", "Are you experiencing any symptoms?", "Describe all symptoms you want to share"),
    ] }];
  } else {
    sections = [{ title: "We’re happy to be on this journey with you", questions: [
      number("pregnancy_weeks", "How far along are you? (weeks)", 0, 45, true),
      q("first_pregnancy", "Is this your first pregnancy?"),
      number("number_of_pregnancies", "How many pregnancies have you had, including this one?", 1, 30, true),
      q("multiples", "Are you carrying multiples?"),
      q("high_risk", "Is your pregnancy considered high risk?"),
      text("appointment_frequency", "How often are your prenatal appointments?", "For example, every four weeks"),
      text("current_symptoms", "What symptoms are you currently experiencing?", "Describe all symptoms you want to share"),
    ] }];
  }
  if (stage !== "planning") sections.push({ title: "Health history specific to this pregnancy", questions: [
    q("current_hypertension_preeclampsia", "Were you diagnosed with gestational hypertension or preeclampsia in this pregnancy?"),
    q("current_gestational_diabetes", "Were you diagnosed with gestational diabetes in this pregnancy?"),
    q("bp_concerns", "Has your doctor mentioned concerns about your blood pressure?"),
    text("pregnancy_medications", "Were you prescribed any medication during this pregnancy?", "Names, or none"),
  ] });
  return [basics, ...sections, { title: "Your pregnancy history", questions: HISTORY_QUESTIONS }];
}

export function familySections(stage: PregnancyStage): IntakeSection[] {
  return [ { title: "About your family", questions: FAMILY_QUESTIONS }, { title: "Your emotional wellbeing", questions: [
    q("depression_anxiety", stage === "postpartum" ? "Are you experiencing postpartum depression or anxiety?" : stage === "pregnant" ? "Are you experiencing significant anxiety or depression during this pregnancy?" : "Have you ever been diagnosed with depression or anxiety?"),
    ...(stage === "postpartum" ? [q("ppd_screening", "Have you been screened for postpartum depression by your provider?")] : []),
    text("support", "How supported do you feel at home?"),
    text("sleep", "How have you been sleeping?"),
    text("emotional_journey", "How are you feeling about the journey ahead?"),
  ] } ];
}

/** Unknown and declined answers must never become a negative clinical fact. */
export function answerBoolean(value: string | undefined): boolean | null {
  return value === "Yes" ? true : value === "No" ? false : null;
}
export function booleanAnswer(value: boolean | null | undefined): string {
  return value === true ? "Yes" : value === false ? "No" : "";
}
export function validateAnswers(questions: IntakeQuestion[], answers: IntakeAnswers): string | null {
  for (const question of questions) {
    const value = answers[question.key]?.trim();
    if (!value) continue;
    if (question.number) {
      const n = Number(value);
      const { min, max, integer } = question.number;
      if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
        return `${question.label}: enter ${integer ? "a whole number" : "a number"} between ${min} and ${max}, or leave it blank.`;
      }
    }
    if (value.length > 1000) return `${question.label}: please use 1,000 characters or fewer.`;
  }
  return null;
}

interface IntakeNotes { format: "kairos-intake-v1"; stage: PregnancyStage; answers: IntakeAnswers; legacyNote?: string }
export function readIntakeNotes(notes: string | null | undefined): IntakeNotes | null {
  if (!notes) return null;
  try {
    const data = JSON.parse(notes);
    if (data?.format !== "kairos-intake-v1" || !data.answers || typeof data.answers !== "object" || Array.isArray(data.answers)) return null;
    const answers: IntakeAnswers = {};
    for (const [key, value] of Object.entries(data.answers)) if (typeof value === "string") answers[key] = value;
    return { ...data, answers };
  } catch { return null; }
}
export function writeIntakeNotes(stage: PregnancyStage, answers: IntakeAnswers, previous: string | null | undefined): string {
  const prior = readIntakeNotes(previous);
  // Preserve versioned metadata when the original onboarding URL is revisited.
  // The full form still replaces active answers (including explicit blanks).
  const raw = prior && previous ? JSON.parse(previous) as Record<string, unknown> : {};
  const archived = raw.stageAnswers && typeof raw.stageAnswers === "object" && !Array.isArray(raw.stageAnswers)
    ? raw.stageAnswers as Record<string, unknown> : {};
  const priorStage = typeof raw.stage === "string" ? raw.stage : "unknown";
  const stageAnswers = prior && priorStage !== stage
    ? { ...archived, [priorStage]: raw.answers }
    : archived;
  return JSON.stringify({
    ...raw,
    format: "kairos-intake-v1", stage, answers,
    ...(Object.keys(stageAnswers).length ? { stageAnswers } : {}),
    legacyNote: prior?.legacyNote ?? (!prior && previous ? previous : undefined),
  });
}

/** Calendar-only dates: no UTC conversion and no normalized invalid dates. */
export function validIntakeDate(value: string, kind: "due" | "birth", now = new Date()): string | null {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Use YYYY-MM-DD, or leave this blank.";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "Please enter a valid calendar date.";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (kind === "birth" && date > today) return "Your birth date cannot be in the future.";
  if (kind === "due") {
    const min = new Date(today); min.setDate(min.getDate() - 42);
    const max = new Date(today); max.setDate(max.getDate() + 315);
    if (date < min || date > max) return "Check your expected due date, or leave it blank if you are unsure.";
  }
  return null;
}
