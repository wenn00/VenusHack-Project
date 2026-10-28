import { describe, expect, it } from "vitest";
import { answerBoolean, familySections, pregnancySections, readIntakeNotes, validIntakeDate, validateAnswers, writeIntakeNotes } from "./intake";

describe("intake answers", () => {
  it("distinguishes missing and declined answers from no", () => {
    for (const v of [undefined, "", "Not sure", "Prefer not to answer"]) expect(answerBoolean(v)).toBeNull();
    expect(answerBoolean("No")).toBe(false);
    expect(answerBoolean("Yes")).toBe(true);
  });
  it("preserves legacy notes while round-tripping structured answers", () => {
    const saved = writeIntakeNotes("planning", { doctor: "Dr. Lee", diagnoses: "" }, "Existing clinical note");
    const edited = writeIntakeNotes("planning", { doctor: "Dr. Lin" }, saved);
    expect(readIntakeNotes(edited)).toMatchObject({ answers: { doctor: "Dr. Lin" }, legacyNote: "Existing clinical note" });
  });
  it("preserves archives and unknown metadata on full saves without merging old active answers", () => {
    const previous = JSON.stringify({ format: "kairos-intake-v1", stage: "pregnant", answers: { current_symptoms: "Old symptom", doctor: "Dr. A", future_answer: { detail: 1 } }, legacyNote: "Old note", futureMetadata: { version: 2 }, stageAnswers: { planning: { activity: "Active" } } });
    const saved = JSON.parse(writeIntakeNotes("postpartum", { breastfeeding: "No", doctor: "" }, previous));
    expect(saved.answers).toEqual({ breastfeeding: "No", doctor: "" });
    expect(saved.stageAnswers).toMatchObject({ planning: { activity: "Active" }, pregnant: { current_symptoms: "Old symptom", future_answer: { detail: 1 } } });
    expect(saved.futureMetadata).toEqual({ version: 2 });
    const edited = JSON.parse(writeIntakeNotes("postpartum", { breastfeeding: "" }, JSON.stringify(saved)));
    expect(edited.answers).toEqual({ breastfeeding: "" });
    expect(edited.stageAnswers).toEqual(saved.stageAnswers);
    expect(edited.legacyNote).toBe("Old note");
  });
  it("does not mistake arbitrary JSON or invalid data for intake", () => {
    expect(readIntakeNotes('{"answers":{}}')).toBeNull();
    expect(readIntakeNotes("not json")).toBeNull();
    expect(readIntakeNotes('{"format":"kairos-intake-v1","answers":[]}')).toBeNull();
  });
  it("validates number input without requiring optional answers", () => {
    const qs = pregnancySections("pregnant").flatMap(s => s.questions);
    expect(validateAnswers(qs, {})).toBeNull();
    for (const v of ["NaN", "-3", "46", "12.5", "1e1"]) expect(validateAnswers(qs, { pregnancy_weeks: v })).not.toBeNull();
    expect(validateAnswers(qs, { pregnancy_weeks: "16", weight_kg: "65.5" })).toBeNull();
  });
  it("branches to stage-specific questions", () => {
    const keys = (stage: "planning" | "pregnant" | "postpartum") => pregnancySections(stage).flatMap(s => s.questions.map(q => q.key));
    expect(keys("planning")).toContain("nicotine");
    expect(keys("planning")).not.toContain("breastfeeding");
    expect(keys("pregnant")).toContain("multiples");
    expect(keys("postpartum")).toContain("postpartum_checkup");
    expect(familySections("postpartum")[1].questions.map(q => q.key)).toContain("ppd_screening");
  });
});

describe("intake dates", () => {
  const now = new Date(2026, 9, 28);
  it("allows unknown dates and rejects invalid or future birth dates", () => {
    expect(validIntakeDate("", "birth", now)).toBeNull();
    expect(validIntakeDate("2026-10-29", "birth", now)).not.toBeNull();
    expect(validIntakeDate("2026-02-30", "birth", now)).not.toBeNull();
    expect(validIntakeDate("2026-10-28", "birth", now)).toBeNull();
  });
  it("accepts plausible due dates including recently overdue dates", () => {
    expect(validIntakeDate("2026-10-20", "due", now)).toBeNull();
    expect(validIntakeDate("2027-03-10", "due", now)).toBeNull();
    expect(validIntakeDate("2030-01-01", "due", now)).not.toBeNull();
  });
});
