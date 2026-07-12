/**
 * Mock data generators used while Apple HealthKit is not yet wired up
 * and for empty-state seeding during demo.
 */

import { LiveVitals } from "@/types";

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
