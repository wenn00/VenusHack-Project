import { describe, expect, it } from "vitest";
import { getPregnancyWeeks } from "./pregnancy";

// Fixed "now" for deterministic math.
const NOW = new Date(2026, 6, 13, 12, 0, 0); // July 13, 2026 local noon

function dueInDays(days: number): string {
  const due = new Date(NOW);
  due.setDate(due.getDate() + days);
  const y = due.getFullYear();
  const m = String(due.getMonth() + 1).padStart(2, "0");
  const d = String(due.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("getPregnancyWeeks", () => {
  it("returns null instead of fabricating a week when due date is missing", () => {
    // Previously returned a confident "16 weeks" for users with no due date.
    expect(getPregnancyWeeks(null, NOW)).toBeNull();
    expect(getPregnancyWeeks(undefined, NOW)).toBeNull();
    expect(getPregnancyWeeks("not-a-date", NOW)).toBeNull();
  });

  it("computes exact week boundaries", () => {
    // 16w0d: 24 weeks until due.
    expect(getPregnancyWeeks(dueInDays(24 * 7), NOW)).toBe(16);
  });

  it("floors within a week instead of rounding up (16w4d is still week 16)", () => {
    // Previously Math.round bumped the displayed week 3.5 days early.
    expect(getPregnancyWeeks(dueInDays(24 * 7 - 4), NOW)).toBe(16);
    expect(getPregnancyWeeks(dueInDays(23 * 7), NOW)).toBe(17);
  });

  it("parses the date-only string in local time, not UTC", () => {
    // For a user west of UTC, new Date("YYYY-MM-DD") lands on the previous
    // local day, shifting week boundaries. Compare against a same-day due
    // date: 40 weeks exactly.
    expect(getPregnancyWeeks(dueInDays(0), NOW)).toBe(40);
  });

  it("clamps to the displayable 1..40 range", () => {
    expect(getPregnancyWeeks(dueInDays(45 * 7), NOW)).toBe(1);
    expect(getPregnancyWeeks(dueInDays(-3 * 7), NOW)).toBe(40);
  });
});
