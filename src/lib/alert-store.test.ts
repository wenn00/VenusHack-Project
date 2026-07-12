import { describe, expect, it } from "vitest";
import { getActiveAlert, setActiveAlert } from "./alert-store";
import { KpinEvaluation } from "@/types";

const evaluation: KpinEvaluation = {
  level: "red",
  triggers: ["bp_high"],
  message: "This reading deserves attention.",
  detail: "Your blood pressure (150/98) is above the safe range during pregnancy.",
  primaryAction: { label: "Call my OB", kind: "call_ob" },
  secondaryActions: [],
};

describe("alert store", () => {
  it("hands the last dispatched evaluation to the alert screen", () => {
    setActiveAlert(evaluation);
    expect(getActiveAlert()).toEqual(evaluation);
  });

  it("survives repeated reads (screen re-renders)", () => {
    setActiveAlert(evaluation);
    getActiveAlert();
    expect(getActiveAlert()).toEqual(evaluation);
  });
});
