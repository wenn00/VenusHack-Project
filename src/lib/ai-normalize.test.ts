import { describe, expect, it } from "vitest";
import { normalizeDoctorSummary, normalizeVoiceJournalSummary } from "./ai-normalize";

describe("normalizeVoiceJournalSummary", () => {
  it("passes a well-formed summary through", () => {
    const raw = {
      symptoms: ["headache"],
      mood: "low",
      key_concerns: ["persistent headache"],
      red_flag_symptoms: [],
      recommended_next_step: "Rest and re-check tonight.",
    };
    expect(normalizeVoiceJournalSummary(raw)).toEqual(raw);
  });

  it("fills missing array fields so the summary screen cannot crash", () => {
    // json_object mode guarantees syntax, not schema: a response missing
    // red_flag_symptoms previously threw at render time AFTER a successful
    // save (summary.red_flag_symptoms.length).
    const result = normalizeVoiceJournalSummary({ mood: "good" });
    expect(result.symptoms).toEqual([]);
    expect(result.key_concerns).toEqual([]);
    expect(result.red_flag_symptoms).toEqual([]);
    expect(typeof result.recommended_next_step).toBe("string");
  });

  it("coerces an out-of-union mood to a safe default", () => {
    expect(normalizeVoiceJournalSummary({ mood: "ecstatic" }).mood).toBe("okay");
  });

  it("drops non-string array members", () => {
    const result = normalizeVoiceJournalSummary({ symptoms: ["headache", 42, null] });
    expect(result.symptoms).toEqual(["headache"]);
  });

  it("survives junk input", () => {
    expect(normalizeVoiceJournalSummary(null).red_flag_symptoms).toEqual([]);
    expect(normalizeVoiceJournalSummary("nope").mood).toBe("okay");
  });
});

describe("normalizeDoctorSummary", () => {
  it("fills any missing section with an empty array", () => {
    const result = normalizeDoctorSummary({ vitals_summary: ["BP trending up"] });
    expect(result.vitals_summary).toEqual(["BP trending up"]);
    expect(result.urgent_concerns).toEqual([]);
    expect(result.patient_context).toEqual([]);
    expect(result.questions_to_ask).toEqual([]);
  });

  it("drops non-string bullets", () => {
    const result = normalizeDoctorSummary({ risk_factors: [{ text: "x" }, "history of preeclampsia"] });
    expect(result.risk_factors).toEqual(["history of preeclampsia"]);
  });
});
