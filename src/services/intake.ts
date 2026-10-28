import { supabase } from "@/services/supabase";
import { IntakeAnswers, answerBoolean, writeIntakeNotes } from "@/lib/intake";
import { PregnancyStage } from "@/types/user";

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
