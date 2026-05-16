/**
 * Mock data generators used while Apple HealthKit is not yet wired up
 * and for empty-state seeding during demo.
 */

import { LiveVitals, MoodEntry, Mood } from "@/types";

/**
 * Produce a snapshot of plausible live vitals.
 * Numbers drift slightly each call so the dashboard feels alive.
 */
export function generateLiveVitals(): LiveVitals {
  return {
    heartRate: randomInt(72, 88),
    systolic: randomInt(116, 128),
    diastolic: randomInt(72, 82),
    hrvMs: randomInt(34, 58),
    sleepHours: round(randomFloat(6.5, 8.4), 1),
    steps: randomInt(2400, 6800),
  };
}

/**
 * Produce a 7-day mood trend for the dashboard mini chart.
 * Trends slightly down to make the demo feel intentional.
 */
export function generateMoodHistory(userId: string): MoodEntry[] {
  const moods: Mood[] = ["good", "good", "okay", "good", "okay", "low", "okay"];
  const now = Date.now();
  return moods.map((mood, idx) => ({
    id: `mock-mood-${idx}`,
    userId,
    mood,
    note: null,
    loggedAt: new Date(now - (6 - idx) * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

/**
 * Compute the longest current streak of consecutive days with a mood entry.
 */
export function computeMoodStreak(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => e.loggedAt.slice(0, 10)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

// ---- helpers ---------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
