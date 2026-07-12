/**
 * Blood-pressure input validation.
 *
 * The entry form previously accepted any finite integer, so a dropped
 * digit ("12" for "120") was stored and classified as a healthy reading,
 * poisoning the doctor-prep dataset. Bounds are deliberately generous —
 * they reject data-entry mistakes, not unusual physiology.
 */

const SYSTOLIC_RANGE = { min: 60, max: 260 };
const DIASTOLIC_RANGE = { min: 30, max: 200 };
const PULSE_RANGE = { min: 20, max: 250 };

export type BpValidationResult =
  | { ok: true; systolic: number; diastolic: number; pulse: number | null }
  | { ok: false; error: string };

function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

export function validateBpInput(
  systolicText: string,
  diastolicText: string,
  pulseText: string,
): BpValidationResult {
  const systolic = parseWholeNumber(systolicText);
  const diastolic = parseWholeNumber(diastolicText);

  if (systolic === null || diastolic === null) {
    return { ok: false, error: "Please enter whole numbers for both systolic and diastolic." };
  }
  if (systolic < SYSTOLIC_RANGE.min || systolic > SYSTOLIC_RANGE.max) {
    return {
      ok: false,
      error: `Systolic should be between ${SYSTOLIC_RANGE.min} and ${SYSTOLIC_RANGE.max}. Please double-check the reading.`,
    };
  }
  if (diastolic < DIASTOLIC_RANGE.min || diastolic > DIASTOLIC_RANGE.max) {
    return {
      ok: false,
      error: `Diastolic should be between ${DIASTOLIC_RANGE.min} and ${DIASTOLIC_RANGE.max}. Please double-check the reading.`,
    };
  }
  if (systolic <= diastolic) {
    return {
      ok: false,
      error: "Systolic (top) should be higher than diastolic (bottom). Please double-check the reading.",
    };
  }

  let pulse: number | null = null;
  if (pulseText.trim().length > 0) {
    pulse = parseWholeNumber(pulseText);
    if (pulse === null || pulse < PULSE_RANGE.min || pulse > PULSE_RANGE.max) {
      return {
        ok: false,
        error: `Pulse should be a number between ${PULSE_RANGE.min} and ${PULSE_RANGE.max}, or left empty.`,
      };
    }
  }

  return { ok: true, systolic, diastolic, pulse };
}
