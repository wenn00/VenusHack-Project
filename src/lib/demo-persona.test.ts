import { describe, expect, it } from "vitest";
import {
  DEMO_FAMILY_ANSWERS,
  DEMO_PERSONA_NAME,
  DEMO_PREGNANCY_ANSWERS,
  demoDueDate,
  demoMoodRows,
} from "./demo-persona";
import { answerBoolean } from "./intake";

describe("demo persona", () => {
  it("is clearly labelled as a demo", () => {
    expect(DEMO_PERSONA_NAME).toBe("Maya (Demo)");
  });

  it("puts the due date seven weeks out, so Maya is ~33 weeks pregnant", () => {
    expect(demoDueDate(new Date(2026, 9, 30))).toBe("2026-12-18");
  });

  it("records a prior gestational hypertension and nothing else in pregnancy history", () => {
    expect(answerBoolean(DEMO_PREGNANCY_ANSWERS.had_gestational_hypertension)).toBe(true);
    for (const key of ["had_preeclampsia", "had_gestational_diabetes", "had_preterm_birth", "had_eclampsia"]) {
      expect(answerBoolean(DEMO_PREGNANCY_ANSWERS[key])).toBe(false);
    }
    expect(DEMO_PREGNANCY_ANSWERS.number_of_pregnancies).toBe("2");
  });

  it("records family hypertension and nothing else in family history", () => {
    expect(answerBoolean(DEMO_FAMILY_ANSWERS.has_hypertension_family)).toBe(true);
    for (const key of ["has_cvd_family", "has_stroke_family", "has_diabetes_family"]) {
      expect(answerBoolean(DEMO_FAMILY_ANSWERS[key])).toBe(false);
    }
  });

  it("builds a week of moods drifting from great to low, ending now", () => {
    const now = new Date("2026-10-30T18:00:00Z");
    const rows = demoMoodRows("user-1", now);
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.mood)).toEqual(["great", "good", "good", "okay", "okay", "low", "low"]);
    expect(rows[6].logged_at).toBe(now.toISOString());
    expect(rows[0].logged_at).toBe(new Date("2026-10-24T18:00:00Z").toISOString());
    expect(rows.every((r) => r.user_id === "user-1" && r.note.length > 0)).toBe(true);
  });
});
