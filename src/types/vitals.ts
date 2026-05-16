/**
 * Vitals and physiological measurements.
 */

export type BpSource = "manual" | "apple_health" | "rppg" | "bluetooth_cuff";
export type VitalsMeasurementType = "rppg" | "apple_health" | "manual";

export interface BpReading {
  id: string;
  userId: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: string;
  source: BpSource;
  notes: string | null;
}

export interface VitalsLog {
  id: string;
  userId: string;
  measurementType: VitalsMeasurementType;
  heartRate: number | null;
  hrvMs: number | null;
  spo2: number | null;
  confidenceScore: number | null;
  measuredAt: string;
}

/**
 * Live snapshot of mock vitals shown on the dashboard.
 */
export interface LiveVitals {
  heartRate: number;
  systolic: number;
  diastolic: number;
  hrvMs: number;
  sleepHours: number;
  steps: number;
}
