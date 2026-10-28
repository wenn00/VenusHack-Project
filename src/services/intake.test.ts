import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveIntakeHistory } from "./intake";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { from: mocks.from } }));

function setup(existing: { id: string; notes: string | null } | null, saveError = false) {
  const lookup: any = {};
  for (const method of ["select", "eq", "order", "limit"]) lookup[method] = vi.fn(() => lookup);
  lookup.maybeSingle = vi.fn(async () => ({ data: existing, error: null }));
  const mutation: any = {};
  for (const method of ["insert", "update", "eq", "select"]) mutation[method] = vi.fn(() => mutation);
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
