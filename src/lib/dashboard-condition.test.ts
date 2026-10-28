import { describe, expect, it } from "vitest";
import { getDashboardCondition } from "./dashboard-condition";
const now = new Date(2026, 9, 28, 12);
describe("dashboard condition", () => {
  it("never gives planning users a pregnancy week", () => {
    expect(getDashboardCondition({ stage: "planning", dueDate: "2027-01-01", postpartumStartDate: null }, now).value).toBe("Planning");
  });
  it("uses local calendar weeks postpartum", () => {
    expect(getDashboardCondition({ stage: "postpartum", dueDate: null, postpartumStartDate: "2026-10-14" }, now).value).toBe("2");
  });
  it("does not fabricate postpartum weeks without a valid past date", () => {
    for (const date of [null, "invalid", "2026-11-01"]) {
      expect(getDashboardCondition({ stage: "postpartum", dueDate: null, postpartumStartDate: date }, now).numeric).toBe(false);
    }
  });
  it("does not fabricate pregnancy weeks for an impossible date", () => {
    expect(getDashboardCondition({ stage: "pregnant", dueDate: "2026-02-30", postpartumStartDate: null }, now).numeric).toBe(false);
  });
});
