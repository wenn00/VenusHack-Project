import { supabase } from "@/services/supabase";
import { IntakeAnswers, answerBoolean, writeIntakeNotes } from "@/lib/intake";
import { PregnancyStage } from "@/types/user";
import { HISTORY_COLUMNS, HistoryTable, mergeSectionNotes } from "@/lib/profile-editing";

/** Existing notes columns hold versioned supplemental responses; no new schema is required. */
export async function saveIntakeHistory(table: "pregnancy_history" | "family_history", userId: string, stage: PregnancyStage, answers: IntakeAnswers): Promise<void> {
  const { data: existing, error: lookupError } = await supabase.from(table).select("id, notes").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw new Error("Could not load your saved answers. Please try again.");
  const keys = table === "pregnancy_history"
    ? ["had_preeclampsia", "had_gestational_hypertension", "had_gestational_diabetes", "had_preterm_birth", "had_eclampsia"]
    : ["has_cvd_family", "has_stroke_family", "has_diabetes_family", "has_hypertension_family"];
  const row: Record<string, unknown> = {
    user_id: userId,
    notes: writeIntakeNotes(stage, answers, existing?.notes),
  };
  for (const key of keys) row[key] = answerBoolean(answers[key]);
  if (table === "pregnancy_history") row.number_of_pregnancies = answers.number_of_pregnancies?.trim() ? Number(answers.number_of_pregnancies) : null;
  const request = existing
    ? supabase.from(table).update(row).eq("id", existing.id).eq("user_id", userId)
    : supabase.from(table).insert(row);
  const { data, error } = await request.select("id").single();
  if (error || !data) throw new Error("Could not save your answers. Your input is still here; please try again.");
}

/** Update a single section without resetting facts owned by other sections. */
export async function saveIntakeSection(table: HistoryTable, userId: string, stage: PregnancyStage, patch: IntakeAnswers): Promise<void> {
  if (Object.values(patch).some(value => typeof value !== "string")) throw new Error("Some answers are invalid. Please check them and try again.");
  let pregnancyCount: number | null = null;
  if (table === "pregnancy_history" && Object.hasOwn(patch, "number_of_pregnancies") && patch.number_of_pregnancies.trim()) {
    const value = patch.number_of_pregnancies.trim();
    pregnancyCount = Number(value);
    if (!/^\d+$/.test(value) || !Number.isInteger(pregnancyCount) || pregnancyCount < 0 || pregnancyCount > 30) {
      throw new Error("Enter a whole number of pregnancies between 0 and 30, or leave it blank.");
    }
  }
  const { data: existing, error: lookupError } = await supabase.from(table).select("id, notes")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw new Error("Could not load your saved answers. Please try again.");
  const row: Record<string, unknown> = { user_id: userId, notes: mergeSectionNotes(table, stage, patch, existing?.notes) };
  for (const key of Object.keys(HISTORY_COLUMNS[table])) {
    if (Object.hasOwn(patch, key)) row[key] = answerBoolean(patch[key]);
    else if (!existing) row[key] = null; // Never accept the database's false defaults for unasked questions.
  }
  if (table === "pregnancy_history" && (Object.hasOwn(patch, "number_of_pregnancies") || !existing)) row.number_of_pregnancies = pregnancyCount;
  let request;
  if (existing) {
    request = supabase.from(table).update(row).eq("id", existing.id).eq("user_id", userId);
    // Compare-and-swap prevents a stale tab from overwriting a newer section's
    // notes between this read and update. A retry reloads that newer snapshot.
    request = existing.notes === null ? request.is("notes", null) : request.eq("notes", existing.notes);
  } else request = supabase.from(table).insert(row);
  const { data, error } = await request.select("id").single();
  if (error || !data) throw new Error("Could not save your answers. Your input is still here; please try again.");
}
