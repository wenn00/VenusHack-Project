import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveIntakeHistory, saveIntakeSection } from "./intake";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { from: mocks.from } }));

function setup(existing: { id: string; notes: string | null } | null, saveError = false, lookupError = false) {
  const lookup: any = {};
  for (const method of ["select", "eq", "order", "limit"]) lookup[method] = vi.fn(() => lookup);
  lookup.maybeSingle = vi.fn(async () => ({ data: existing, error: lookupError ? { message: "offline" } : null }));
  const mutation: any = {};
  for (const method of ["insert", "update", "eq", "is", "select"]) mutation[method] = vi.fn(() => mutation);
  mutation.single = vi.fn(async () => ({ data: saveError ? null : { id: "saved" }, error: saveError ? { message: "permission denied" } : null }));
  mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(mutation);
  return { lookup, mutation };
}
beforeEach(() => vi.resetAllMocks());
describe("saveIntakeHistory", () => {
  it("persists unanswered history as null, never the database false default", async () => {
    const { mutation } = setup(null);
    await saveIntakeHistory("pregnancy_history", "user-a", "pregnant", {});
    const row = mutation.insert.mock.calls[0][0];
    expect(row).toMatchObject({ user_id: "user-a", had_preeclampsia: null, had_eclampsia: null, number_of_pregnancies: null });
    expect(JSON.parse(row.notes).answers).toEqual({});
  });
  it("updates the user's existing row and preserves legacy notes", async () => {
    const { mutation } = setup({ id: "history-a", notes: "Earlier note" });
    await saveIntakeHistory("family_history", "user-a", "planning", { has_cvd_family: "No", has_stroke_family: "Not sure", support: "My partner" });
    expect(mutation.eq).toHaveBeenCalledWith("id", "history-a");
    expect(mutation.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(mutation.update.mock.calls[0][0]).toMatchObject({ has_cvd_family: false, has_stroke_family: null });
    expect(JSON.parse(mutation.update.mock.calls[0][0].notes)).toMatchObject({ legacyNote: "Earlier note", answers: { support: "My partner" } });
  });
  it("surfaces a failed or zero-row write rather than reporting success", async () => {
    setup(null, true);
    await expect(saveIntakeHistory("family_history", "user-a", "planning", {})).rejects.toThrow("Could not save");
  });
});

describe("saveIntakeSection", () => {
  it("updates only dirty canonical fields and preserves unrelated section notes", async () => {
    const previous = JSON.stringify({ format: "kairos-intake-v1", stage: "planning", answers: { height_cm: "165", doctor: "Doctor A", had_eclampsia: "Yes" }, legacyNote: "Earlier note" });
    const { mutation } = setup({ id: "p", notes: previous });
    await saveIntakeSection("pregnancy_history", "u", "planning", { had_preeclampsia: "No", had_gestational_hypertension: "Not sure", number_of_pregnancies: "0" });
    const row = mutation.update.mock.calls[0][0];
    expect(row).toMatchObject({ had_preeclampsia: false, had_gestational_hypertension: null, number_of_pregnancies: 0 });
    expect(row).not.toHaveProperty("had_eclampsia");
    expect(row).not.toHaveProperty("had_gestational_diabetes");
    expect(JSON.parse(row.notes)).toMatchObject({ legacyNote: "Earlier note", answers: { height_cm: "165", doctor: "Doctor A", had_eclampsia: "Yes" } });
    expect(mutation.eq).toHaveBeenCalledWith("notes", previous);
    expect(mutation.eq).toHaveBeenCalledWith("user_id", "u");
  });
  it("uses null optimistic concurrency filter and does not clear unedited count", async () => {
    const { mutation } = setup({ id: "p", notes: null });
    await saveIntakeSection("pregnancy_history", "u", "planning", { height_cm: "170" });
    expect(mutation.is).toHaveBeenCalledWith("notes", null);
    expect(mutation.update.mock.calls[0][0]).not.toHaveProperty("number_of_pregnancies");
    expect(mutation.update.mock.calls[0][0]).not.toHaveProperty("had_preeclampsia");
  });
  it("initializes unasked facts as null for a new history row", async () => {
    const { mutation } = setup(null);
    await saveIntakeSection("pregnancy_history", "u", "postpartum", { breastfeeding: "No" });
    expect(mutation.insert.mock.calls[0][0]).toMatchObject({ had_preeclampsia: null, had_eclampsia: null, number_of_pregnancies: null });
    expect(JSON.parse(mutation.insert.mock.calls[0][0].notes).answers).toEqual({ breastfeeding: "No" });
  });
  it("archives previous stage data when a section is saved in a new stage", async () => {
    const { mutation } = setup({ id: "p", notes: JSON.stringify({ format: "kairos-intake-v1", stage: "pregnant", answers: { current_symptoms: "Prenatal symptom", doctor: "Dr A" } }) });
    await saveIntakeSection("pregnancy_history", "u", "postpartum", { breastfeeding: "Yes" });
    const saved = JSON.parse(mutation.update.mock.calls[0][0].notes);
    expect(saved.stageAnswers.pregnant.current_symptoms).toBe("Prenatal symptom");
    expect(saved.answers).toEqual({ doctor: "Dr A", breastfeeding: "Yes" });
  });
  it("does not create a replacement when lookup failed", async () => {
    const { mutation } = setup(null, false, true);
    await expect(saveIntakeSection("family_history", "u", "planning", { support: "Partner" })).rejects.toThrow("Could not load");
    expect(mutation.insert).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("surfaces an optimistic-concurrency conflict or failed write", async () => {
    setup({ id: "f", notes: null }, true);
    await expect(saveIntakeSection("family_history", "u", "planning", { sleep: "Better" })).rejects.toThrow("Could not save");
  });
  it("clears counts only when explicitly patched and rejects malformed counts", async () => {
    const { mutation } = setup({ id: "p", notes: null });
    await saveIntakeSection("pregnancy_history", "u", "planning", { number_of_pregnancies: "" });
    expect(mutation.update.mock.calls[0][0].number_of_pregnancies).toBeNull();
    await expect(saveIntakeSection("pregnancy_history", "u", "planning", { number_of_pregnancies: "nope" })).rejects.toThrow("whole number");
  });
});
