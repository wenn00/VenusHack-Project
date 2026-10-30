import { describe, expect, it } from "vitest";
import { evaluateBp, evaluateRppg, evaluateSymptoms } from "./kpin";
import { evaluateBaselineRisk } from "./risk-analysis";
import { PregnancyHistory, FamilyHistory, SymptomReport, UserProfile, VitalsLog } from "@/types";

function report(symptoms: SymptomReport["symptoms"], severity: SymptomReport["severity"]): SymptomReport {
  return { id: "r1", userId: "u1", symptoms, severity, notes: null, reportedAt: "2026-07-13T09:00:00Z" };
}

describe("evaluateSymptoms trigger provenance", () => {
  it("attributes decreased fetal movement to its own trigger, not the voice journal", () => {
    // Previously fell through to the default "voice_journal_concern",
    // misattributing the most serious obstetric red flag in the audit trail.
    const ev = evaluateSymptoms(report(["decreased_fetal_movement"], "mild"));
    expect(ev.level).toBe("red");
    expect(ev.triggers).toEqual(["symptom_decreased_fetal_movement"]);
  });

  it("attributes severe abdominal pain to its own trigger", () => {
    const ev = evaluateSymptoms(report(["severe_abdominal_pain"], "mild"));
    expect(ev.triggers).toEqual(["symptom_abdominal_pain_severe"]);
  });

  it("keeps existing mappings", () => {
    const ev = evaluateSymptoms(report(["chest_pain", "vision_changes"], "mild"));
    expect(ev.triggers).toEqual(["symptom_chest_pain", "symptom_vision_changes"]);
  });
});

describe("evaluateBp boundaries (characterization)", () => {
  const reading = (systolic: number, diastolic: number) => ({
    id: "b1", userId: "u1", systolic, diastolic, pulse: null,
    measuredAt: "2026-07-13T09:00:00Z", source: "manual" as const, notes: null,
  });

  it("pins the ACOG-style thresholds", () => {
    expect(evaluateBp(reading(159, 109)).level).toBe("red");
    expect(evaluateBp(reading(160, 80)).level).toBe("red");
    expect(evaluateBp(reading(140, 80)).level).toBe("red");
    expect(evaluateBp(reading(130, 80)).level).toBe("yellow");
    expect(evaluateBp(reading(129, 84)).level).toBe("green");
  });
});

describe("evaluateRppg: a single camera reading never raises a red alert", () => {
  const camera = (heartRate: number, measuredAt: string): VitalsLog => ({
    id: `v-${measuredAt}`, userId: "u1", measurementType: "rppg", heartRate,
    hrvMs: 40, spo2: null, confidenceScore: 0.8, measuredAt,
  });
  const NOW = "2026-10-29T18:00:00Z";
  const TEN_MIN_AGO = "2026-10-29T17:50:00Z";
  const TWO_HOURS_AGO = "2026-10-29T16:00:00Z";

  it("asks for a re-measure, not a call to the OB, on a first very high reading", () => {
    // Previously red ("Call my OB") on one reading: a camera misread (e.g. the
    // pulse's 2x harmonic) would send a pregnant user to a false alarm.
    const ev = evaluateRppg(camera(135, NOW));
    expect(ev.level).toBe("yellow");
    expect(ev.primaryAction.kind).not.toBe("call_ob");
  });

  it("raises red when a second very high reading confirms the first", () => {
    const ev = evaluateRppg(camera(135, NOW), camera(132, TEN_MIN_AGO));
    expect(ev.level).toBe("red");
    expect(ev.primaryAction.kind).toBe("call_ob");
  });

  it("does not treat a reading from hours earlier as confirmation", () => {
    expect(evaluateRppg(camera(135, NOW), camera(132, TWO_HOURS_AGO)).level).toBe("yellow");
  });

  it("does not treat a reading taken after this one as confirmation", () => {
    expect(evaluateRppg(camera(135, TEN_MIN_AGO), camera(132, NOW)).level).toBe("yellow");
  });

  it("does not count a duplicate save of the same reading as confirmation", () => {
    // Tapping Save twice stores one reading twice, seconds apart; two real
    // recordings can't be closer than the 20 s a recording takes.
    expect(evaluateRppg(camera(135, NOW), camera(135, "2026-10-29T17:59:58Z")).level).toBe("yellow");
  });

  it("stays yellow when only one of the two readings is very high", () => {
    expect(evaluateRppg(camera(135, NOW), camera(118, TEN_MIN_AGO)).level).toBe("yellow");
    expect(evaluateRppg(camera(135, NOW), camera(95, TEN_MIN_AGO)).level).toBe("yellow");
  });

  it("stays yellow for two moderately elevated readings", () => {
    expect(evaluateRppg(camera(118, NOW), camera(115, TEN_MIN_AGO)).level).toBe("yellow");
  });

  it("is green for a normal reading", () => {
    expect(evaluateRppg(camera(85, NOW), camera(132, TEN_MIN_AGO)).level).toBe("green");
  });
});

describe("evaluateBaselineRisk triggers", () => {
  const profile = (stage: UserProfile["stage"]): UserProfile => ({
    id: "u1", email: "x@y.z", fullName: "Test User", stage,
    dueDate: null, postpartumStartDate: null, createdAt: "", updatedAt: "",
  });
  const preg = (overrides: Partial<PregnancyHistory>): PregnancyHistory => ({
    id: "p1", userId: "u1", hadPreeclampsia: false, hadGestationalHypertension: false,
    hadGestationalDiabetes: false, hadPretermBirth: false, hadEclampsia: false,
    numberOfPregnancies: 1, notes: null, ...overrides,
  });
  const family = (overrides: Partial<FamilyHistory>): FamilyHistory => ({
    id: "f1", userId: "u1", hasCvdFamily: false, hasStrokeFamily: false,
    hasDiabetesFamily: false, hasHypertensionFamily: false, notes: null, ...overrides,
  });

  it("records history_preeclampsia as a typed trigger", () => {
    const ev = evaluateBaselineRisk(profile("pregnant"), preg({ hadPreeclampsia: true }), null);
    expect(ev.level).toBe("red");
    expect(ev.triggers).toEqual(["history_preeclampsia"]);
  });

  it("records a trigger for the yellow complication branch (previously empty)", () => {
    const ev = evaluateBaselineRisk(profile("pregnant"), preg({ hadGestationalHypertension: true }), null);
    expect(ev.level).toBe("yellow");
    expect(ev.triggers).toEqual(["history_complication"]);
  });

  it("records postpartum monitoring", () => {
    const ev = evaluateBaselineRisk(profile("postpartum"), preg({}), null);
    expect(ev.level).toBe("yellow");
    expect(ev.triggers).toContain("postpartum_monitoring");
  });

  it("records family history risk", () => {
    const ev = evaluateBaselineRisk(profile("pregnant"), preg({}), family({ hasCvdFamily: true }));
    expect(ev.level).toBe("yellow");
    expect(ev.triggers).toEqual(["family_history_risk"]);
  });
});
