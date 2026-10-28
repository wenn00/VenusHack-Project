import { describe, expect, it } from "vitest";
import { getHistoryAnswers, mergeSectionNotes } from "./profile-editing";
import type { PregnancyHistory, FamilyHistory } from "@/types/user";
const pregnancy: PregnancyHistory = { id: "p", userId: "u", hadPreeclampsia: false, hadGestationalHypertension: null, hadGestationalDiabetes: true, hadPretermBirth: null, hadEclampsia: null, numberOfPregnancies: 0, notes: null };
const family: FamilyHistory = { id: "f", userId: "u", hasCvdFamily: false, hasStrokeFamily: null, hasDiabetesFamily: null, hasHypertensionFamily: true, notes: null };
const notes = (stage: string, answers: Record<string, unknown>, extra = {}) => JSON.stringify({ format: "kairos-intake-v1", stage, answers, ...extra });
describe("section answer preservation", () => {
  it("merges one section while retaining other answers and unknown envelope metadata", () => {
    const previous = notes("pregnant", { height_cm: "165", doctor: "Doctor A", current_symptoms: "Tired", custom_field: { source: "older client" } }, { legacyNote: "Original note", futureFlag: true });
    const merged = JSON.parse(mergeSectionNotes("pregnancy_history", "pregnant", { height_cm: "170" }, previous));
    expect(merged).toMatchObject({ legacyNote: "Original note", futureFlag: true, answers: { height_cm: "170", doctor: "Doctor A", current_symptoms: "Tired", custom_field: { source: "older client" } } });
  });
  it("keeps a cleared field explicit rather than restoring its old value", () => {
    expect(JSON.parse(mergeSectionNotes("family_history", "pregnant", { sleep: "" }, notes("pregnant", { sleep: "Poor", support: "Partner" }))).answers).toEqual({ sleep: "", support: "Partner" });
  });
  it("archives prior-stage symptoms while sharing basics and restoring matching-stage answers", () => {
    const previous = notes("pregnant", { height_cm: "165", current_symptoms: "Old prenatal symptom", high_risk: "Yes", future_answer: "retain" }, { stageAnswers: { planning: { activity: "Lightly active" }, postpartum: { breastfeeding: "No", height_cm: "160" } } });
    const next = JSON.parse(mergeSectionNotes("pregnancy_history", "postpartum", { bp_checked: "Not sure" }, previous));
    expect(next.answers).toEqual({ breastfeeding: "No", height_cm: "165", bp_checked: "Not sure" });
    expect(next.stageAnswers.pregnant.current_symptoms).toBe("Old prenatal symptom");
    expect(next.stageAnswers.pregnant.future_answer).toBe("retain");
    expect(next.stageAnswers.planning.activity).toBe("Lightly active");
    const restored = JSON.parse(mergeSectionNotes("pregnancy_history", "pregnant", {}, JSON.stringify(next)));
    expect(restored.answers.current_symptoms).toBe("Old prenatal symptom");
    expect(restored.stageAnswers.postpartum.bp_checked).toBe("Not sure");
  });
  it("preserves unstructured notes", () => {
    expect(JSON.parse(mergeSectionNotes("family_history", "planning", { sleep: "Okay" }, "A note from last year")).legacyNote).toBe("A note from last year");
  });
  it("hydrates canonical false/null/zero and only fields appropriate to the current stage", () => {
    const result = getHistoryAnswers("pregnancy_history", "postpartum", { ...pregnancy, notes: notes("pregnant", { height_cm: "170", pregnancy_weeks: "20", current_symptoms: "Nausea", had_gestational_hypertension: "Not sure", had_preeclampsia: "Yes" }) });
    expect(result).toMatchObject({ height_cm: "170", had_preeclampsia: "No", had_gestational_hypertension: "Not sure", had_gestational_diabetes: "Yes", had_eclampsia: "", number_of_pregnancies: "0" });
    expect(result).not.toHaveProperty("pregnancy_weeks");
    expect(result).not.toHaveProperty("current_symptoms");
  });
  it("keeps family facts but separates wellbeing by stage", () => {
    const result = getHistoryAnswers("family_history", "postpartum", { ...family, notes: notes("pregnant", { early_heart_attack_stroke: "No", depression_anxiety: "Yes", sleep: "Poor", support: "Partner" }) });
    expect(result).toMatchObject({ early_heart_attack_stroke: "No", has_cvd_family: "No", has_stroke_family: "", has_hypertension_family: "Yes" });
    expect(result).not.toHaveProperty("depression_anxiety");
    expect(result).not.toHaveProperty("sleep");
    expect(result).not.toHaveProperty("support");
  });
  it("does not resurrect stale known values when canonical facts are null", () => {
    const result = getHistoryAnswers("pregnancy_history", "planning", { ...pregnancy, hadPreeclampsia: null, numberOfPregnancies: null, notes: notes("planning", { had_preeclampsia: "Yes", number_of_pregnancies: "2", had_eclampsia: "Prefer not to answer" }) });
    expect(result.had_preeclampsia).toBe("");
    expect(result.number_of_pregnancies).toBe("");
    expect(result.had_eclampsia).toBe("Prefer not to answer");
  });
  it("returns no fabricated answers when no history exists", () => {
    expect(getHistoryAnswers("family_history", "planning", null)).toEqual({});
  });
});
