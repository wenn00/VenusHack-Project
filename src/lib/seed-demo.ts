/**
 * Demo body-data seeding.
 *
 * The app uses anonymous sign-in, so every fresh session gets a brand-new
 * user_id and RLS scopes all data to that user. We therefore cannot pre-seed
 * against a fixed id. Instead, the first time a signed-in user has no
 * blood-pressure history, we write a realistic 28-day trend of *body data*
 * (blood pressure + rPPG vitals) for that exact user.
 *
 * Only physical measurements are seeded here. Mood, voice journal, symptoms,
 * KPIN events, chat and the intake history are all generated live during the
 * demo, so those tables are deliberately left empty.
 */

import { supabase } from "@/services/supabase";

const DAY_MS = 86_400_000;

/** ISO timestamp for `n` days ago, pinned to a fixed hour for tidy ordering. */
function daysAgo(n: number, hour = 9): string {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * True when the user has no blood-pressure history yet — our signal that a
 * fresh anonymous account still needs demo body data.
 */
export async function isDemoDataNeeded(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("bp_readings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.warn("[seed-demo] emptiness check failed:", error.message);
    return false;
  }
  return (count ?? 0) === 0;
}

/**
 * Blood-pressure trend: 14 readings across 28 days, climbing from a healthy
 * 118/76 into the red range (>=140 systolic). Day offsets are spaced ~2 days
 * apart so the dashboard chart reads as a steady, worsening trend ending in a
 * reading that warrants an alert. Tune these rows to reshape the story.
 */
const BP_TREND: Array<{ day: number; systolic: number; diastolic: number; pulse: number }> = [
  { day: 28, systolic: 118, diastolic: 76, pulse: 72 },
  { day: 26, systolic: 119, diastolic: 77, pulse: 73 },
  { day: 24, systolic: 121, diastolic: 78, pulse: 74 },
  { day: 21, systolic: 123, diastolic: 80, pulse: 76 },
  { day: 18, systolic: 126, diastolic: 82, pulse: 78 },
  { day: 15, systolic: 128, diastolic: 83, pulse: 80 },
  { day: 12, systolic: 131, diastolic: 85, pulse: 82 },
  { day: 9, systolic: 134, diastolic: 87, pulse: 84 },
  { day: 7, systolic: 137, diastolic: 89, pulse: 86 },
  { day: 5, systolic: 141, diastolic: 91, pulse: 88 },
  { day: 3, systolic: 144, diastolic: 93, pulse: 90 },
  { day: 2, systolic: 146, diastolic: 95, pulse: 91 },
  { day: 1, systolic: 148, diastolic: 96, pulse: 92 },
  { day: 0, systolic: 150, diastolic: 98, pulse: 93 },
];

/**
 * rPPG vitals: ~weekly camera measurements over the same window. Heart rate
 * climbs and HRV falls alongside the rising blood pressure, so the two body-
 * data streams tell one consistent story.
 */
const VITALS_TREND: Array<{ day: number; heartRate: number; hrvMs: number; spo2: number }> = [
  { day: 27, heartRate: 82, hrvMs: 55, spo2: 98 },
  { day: 21, heartRate: 86, hrvMs: 50, spo2: 98 },
  { day: 14, heartRate: 92, hrvMs: 45, spo2: 97 },
  { day: 9, heartRate: 98, hrvMs: 40, spo2: 97 },
  { day: 4, heartRate: 105, hrvMs: 36, spo2: 97 },
  { day: 1, heartRate: 112, hrvMs: 34, spo2: 96 },
];

/**
 * Seed body data for one user. Each table insert is independent: a failure on
 * one is logged and does not abort the other, so a partial seed is still
 * better than none for the demo.
 */
export async function seedDemoData(userId: string): Promise<void> {
  // --- blood pressure -------------------------------------------------
  const bpRows = BP_TREND.map((r) => ({
    user_id: userId,
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse,
    source: "manual" as const,
    measured_at: daysAgo(r.day),
  }));
  const { error: bpError } = await supabase.from("bp_readings").insert(bpRows);
  if (bpError) console.warn("[seed-demo] bp_readings insert failed:", bpError.message);

  // --- rPPG vitals ----------------------------------------------------
  const vitalsRows = VITALS_TREND.map((r) => ({
    user_id: userId,
    measurement_type: "rppg" as const,
    heart_rate: r.heartRate,
    hrv_ms: r.hrvMs,
    spo2: r.spo2,
    confidence_score: 0.82,
    measured_at: daysAgo(r.day, 10),
  }));
  const { error: vitalsError } = await supabase.from("vitals_log").insert(vitalsRows);
  if (vitalsError) console.warn("[seed-demo] vitals_log insert failed:", vitalsError.message);

  console.log("[seed-demo] done — seeded body data for", userId);
}
