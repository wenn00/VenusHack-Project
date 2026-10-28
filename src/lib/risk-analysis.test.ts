import { describe, expect, it } from "vitest";
import { evaluateBaselineRisk } from "./risk-analysis";
import { FamilyHistory, PregnancyHistory } from "@/types/user";
const pregnancy: PregnancyHistory = { id: "p", userId: "u", hadPreeclampsia: null, hadGestationalHypertension: null, hadGestationalDiabetes: null, hadPretermBirth: null, hadEclampsia: null, numberOfPregnancies: null, notes: null };
const family: FamilyHistory = { id: "f", userId: "u", hasCvdFamily: null, hasStrokeFamily: null, hasDiabetesFamily: null, hasHypertensionFamily: null, notes: null };
describe("unknown baseline history", () => {
  it("never describes missing or skipped history as normal risk", () => {
    expect(evaluateBaselineRisk(null, null, null).message).toContain("incomplete");
    expect(evaluateBaselineRisk(null, pregnancy, family).message).toContain("incomplete");
  });
  it("preserves known risk flags when other answers are unknown", () => {
    const result = evaluateBaselineRisk(null, { ...pregnancy, hadPreeclampsia: true }, family);
    expect(result.level).toBe("red");
    expect(result.detail).toContain("unknown");
  });
});
