import { describe, expect, it } from "vitest";
import { DemoSeedState, planDemoSeed, planHasWork, shouldSeedDemoData } from "./seed-policy";

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

const EMPTY: DemoSeedState = {
  profileComplete: false,
  hasPregnancyHistory: false,
  hasFamilyHistory: false,
  bpCount: 0,
  moodCount: 0,
};

describe("planDemoSeed", () => {
  it("never plans anything for an email account, even an empty one", () => {
    const plan = planDemoSeed({ is_anonymous: false }, EMPTY);
    expect(plan).toEqual({ profile: false, pregnancyHistory: false, familyHistory: false, bodyData: false, moods: false });
    expect(planHasWork(plan)).toBe(false);
  });

  it("plans the whole persona for a fresh anonymous visitor", () => {
    const plan = planDemoSeed({ is_anonymous: true }, EMPTY);
    expect(plan).toEqual({ profile: true, pregnancyHistory: true, familyHistory: true, bodyData: true, moods: true });
    expect(planHasWork(plan)).toBe(true);
  });

  it("only fills the missing parts of an older, partially seeded demo account", () => {
    // Anonymous accounts created before the persona existed already have the
    // 28-day BP trend but no profile; re-seeding BP would duplicate it.
    const plan = planDemoSeed({ is_anonymous: true }, { ...EMPTY, bpCount: 14 });
    expect(plan.bodyData).toBe(false);
    expect(plan.profile).toBe(true);
  });

  it("has no work for a fully seeded demo account", () => {
    const plan = planDemoSeed(
      { is_anonymous: true },
      { profileComplete: true, hasPregnancyHistory: true, hasFamilyHistory: true, bpCount: 14, moodCount: 7 },
    );
    expect(planHasWork(plan)).toBe(false);
  });
});
