import { describe, expect, it } from "vitest";
import { shouldSeedDemoData } from "./seed-policy";

describe("shouldSeedDemoData", () => {
  it("seeds a fresh anonymous demo account with no BP history", () => {
    expect(shouldSeedDemoData({ is_anonymous: true }, 0)).toBe(true);
  });

  it("never seeds a real (email) account, even with no BP history", () => {
    // Regression: every genuine new signup previously received a fabricated
    // 28-day hypertensive trend that then appeared in the doctor PDF.
    expect(shouldSeedDemoData({ is_anonymous: false }, 0)).toBe(false);
    expect(shouldSeedDemoData({}, 0)).toBe(false);
  });

  it("never seeds an account that already has BP data", () => {
    expect(shouldSeedDemoData({ is_anonymous: true }, 14)).toBe(false);
  });

  it("never seeds when signed out", () => {
    expect(shouldSeedDemoData(null, 0)).toBe(false);
  });
});
