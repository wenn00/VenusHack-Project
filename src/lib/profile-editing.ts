import { IntakeAnswers, booleanAnswer, familySections, pregnancySections } from "./intake";
import type { FamilyHistory, PregnancyHistory, PregnancyStage } from "@/types/user";

export type HistoryTable = "pregnancy_history" | "family_history";
export const HISTORY_COLUMNS = {
  pregnancy_history: {
    had_preeclampsia: "hadPreeclampsia",
    had_gestational_hypertension: "hadGestationalHypertension",
    had_gestational_diabetes: "hadGestationalDiabetes",
    had_preterm_birth: "hadPretermBirth",
    had_eclampsia: "hadEclampsia",
  },
  family_history: {
    has_cvd_family: "hasCvdFamily",
    has_stroke_family: "hasStrokeFamily",
    has_diabetes_family: "hasDiabetesFamily",
    has_hypertension_family: "hasHypertensionFamily",
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function strings(value: unknown): IntakeAnswers {
  return isRecord(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : {};
}
function envelope(notes: string | null | undefined): Record<string, unknown> | null {
  if (!notes) return null;
  try {
    const value: unknown = JSON.parse(notes);
    return isRecord(value) && value.format === "kairos-intake-v1" && isRecord(value.answers) ? value : null;
  } catch { return null; }
}
function sharedKeys(table: HistoryTable): Set<string> {
  const commonSection = table === "pregnancy_history" ? pregnancySections("planning")[0] : familySections("planning")[0];
  return new Set([...commonSection.questions.map(question => question.key), ...Object.keys(HISTORY_COLUMNS[table]),
    ...(table === "pregnancy_history" ? ["number_of_pregnancies"] : []),
  ]);
}

/** Merge dirty fields only, retaining unsupported metadata for future clients. */
export function mergeSectionNotes(table: HistoryTable, stage: PregnancyStage, patch: IntakeAnswers, previous: string | null | undefined): string {
  const prior = envelope(previous);
  const priorAnswers = isRecord(prior?.answers) ? prior.answers : {};
  const previousStages = isRecord(prior?.stageAnswers) ? prior.stageAnswers : {};
  const priorStage = typeof prior?.stage === "string" ? prior.stage : "unknown";
  const changesStage = prior !== null && priorStage !== stage;
  const priorArchive = previousStages[priorStage];
  const stageAnswers = changesStage
    ? { ...previousStages, [priorStage]: { ...(isRecord(priorArchive) ? priorArchive : {}), ...priorAnswers } }
    : { ...previousStages };
  // Names such as high_risk, sleep and current_symptoms recur across stages,
  // but their answers describe different points in time and must not carry over.
  const shared = sharedKeys(table);
  const targetArchive = stageAnswers[stage];
  const activeAnswers = changesStage
    ? { ...(isRecord(targetArchive) ? targetArchive : {}), ...Object.fromEntries(Object.entries(priorAnswers).filter(([key]) => shared.has(key))) }
    : priorAnswers;
  return JSON.stringify({
    ...prior,
    format: "kairos-intake-v1",
    stage,
    answers: { ...activeAnswers, ...patch },
    ...(Object.keys(stageAnswers).length ? { stageAnswers } : {}),
    ...(!prior && previous ? { legacyNote: previous } : {}),
  });
}

/** Hydrate only the requested stage's fields, plus durable canonical history. */
export function getHistoryAnswers(table: HistoryTable, stage: PregnancyStage, history: PregnancyHistory | FamilyHistory | null | undefined): IntakeAnswers {
  if (!history) return {};
  const merged = envelope(mergeSectionNotes(table, stage, {}, history.notes));
  const notesAnswers = strings(merged?.answers);
  const questions = table === "pregnancy_history" ? pregnancySections(stage) : familySections(stage);
  const currentKeys = new Set(questions.flatMap(section => section.questions.map(question => question.key)));
  const answers = Object.fromEntries(Object.entries(notesAnswers).filter(([key]) => currentKeys.has(key)));
  const fields = history as unknown as Record<string, unknown>;
  for (const [column, property] of Object.entries(HISTORY_COLUMNS[table])) {
    const value = fields[property];
    // The canonical column is authoritative when it has a known value. Keep
    // explicit "Not sure" / declined notes when the canonical value is null.
    if (typeof value === "boolean") answers[column] = booleanAnswer(value);
    else if (!Object.hasOwn(answers, column)) answers[column] = "";
  }
  if (table === "pregnancy_history") {
    const count = fields.numberOfPregnancies;
    if (typeof count === "number" && Number.isFinite(count)) answers.number_of_pregnancies = String(count);
    else if (!Object.hasOwn(answers, "number_of_pregnancies")) answers.number_of_pregnancies = "";
  }
  return answers;
}
