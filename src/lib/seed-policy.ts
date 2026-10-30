/**
 * Policy for demo body-data seeding.
 *
 * Kept free of React Native / Supabase imports so it stays unit-testable.
 * Demo data must only ever land in anonymous demo sessions: the previous
 * "no BP rows yet" check also matched every genuine new signup, writing a
 * fabricated hypertensive trend into real accounts (and from there into
 * the clinician-facing PDF).
 */

export function shouldSeedDemoData(
  user: { is_anonymous?: boolean } | null,
  bpCount: number,
): boolean {
  return Boolean(user?.is_anonymous) && bpCount === 0;
}

/** What the first load of a session found already present for this user. */
export interface DemoSeedState {
  profileComplete: boolean;
  hasPregnancyHistory: boolean;
  hasFamilyHistory: boolean;
  bpCount: number;
  moodCount: number;
}

/** Which parts of the demo persona still need writing. */
export interface DemoSeedPlan {
  profile: boolean;
  pregnancyHistory: boolean;
  familyHistory: boolean;
  bodyData: boolean;
  moods: boolean;
}

/**
 * Plan the demo persona per table: only anonymous sessions are seeded, and
 * only the parts that are missing, so an older partially seeded demo
 * account is completed rather than duplicated.
 */
export function planDemoSeed(
  user: { is_anonymous?: boolean } | null,
  state: DemoSeedState,
): DemoSeedPlan {
  const demo = Boolean(user?.is_anonymous);
  return {
    profile: demo && !state.profileComplete,
    pregnancyHistory: demo && !state.hasPregnancyHistory,
    familyHistory: demo && !state.hasFamilyHistory,
    bodyData: shouldSeedDemoData(user, state.bpCount),
    moods: demo && state.moodCount === 0,
  };
}

export function planHasWork(plan: DemoSeedPlan): boolean {
  return Object.values(plan).some(Boolean);
}
