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
