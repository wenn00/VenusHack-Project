/**
 * KPIN — Key Pregnancy Indicator Network.
 *
 * Pure functions that turn raw measurements into a KpinEvaluation.
 * No side effects: easy to unit-test, easy to compose.
 *
 * Thresholds follow ACOG guidance for pregnancy-related hypertension.
 * These are conservative defaults; production version should be tunable.
 */

import {
  BpReading,
  KpinAction,
  KpinEvaluation,
  KpinLevel,
  KpinTriggerSource,
  SymptomKey,
  SymptomReport,
  VitalsLog,
} from "@/types";

export const KPIN_THRESHOLDS = {
  bp: {
    systolicRed: 140,
    systolicYellow: 130,
    diastolicRed: 90,
    diastolicYellow: 85,
    severeSystolic: 160,
    severeDiastolic: 110,
  },
  hr: {
    elevatedBpm: 110,
    severeBpm: 130,
  },
} as const;

const RED_FLAG_SYMPTOMS: SymptomKey[] = [
  "chest_pain",
  "vision_changes",
  "shortness_of_breath",
  "severe_abdominal_pain",
  "decreased_fetal_movement",
];

/**
 * Evaluate a single blood pressure reading.
 */
export function evaluateBp(reading: BpReading): KpinEvaluation {
  const { systolic, diastolic } = reading;
  const t = KPIN_THRESHOLDS.bp;

  if (systolic >= t.severeSystolic || diastolic >= t.severeDiastolic) {
    return makeEvaluation("red", ["bp_high"], {
      message: "Let's slow down for a moment.",
      detail: `Your reading of ${systolic}/${diastolic} is in the severe range. This needs urgent attention — please call your OB or go to the ER now.`,
      primary: { label: "Call my OB", kind: "call_ob" },
      secondary: [
        { label: "Go to ER", kind: "call_er" },
        { label: "Show me what to say", kind: "self_advocacy" },
      ],
    });
  }

  if (systolic >= t.systolicRed || diastolic >= t.diastolicRed) {
    return makeEvaluation(
      "red",
      [systolic >= t.systolicRed ? "bp_high" : "bp_diastolic_high"],
      {
        message: "This reading deserves attention.",
        detail: `Your blood pressure (${systolic}/${diastolic}) is above the safe range during pregnancy. It's a good idea to contact your provider today.`,
        primary: { label: "Call my OB", kind: "call_ob" },
        secondary: [
          { label: "Show me what to say", kind: "self_advocacy" },
          { label: "Log a symptom", kind: "log_symptom" },
        ],
      },
    );
  }

  if (systolic >= t.systolicYellow || diastolic >= t.diastolicYellow) {
    return makeEvaluation("yellow", ["bp_high"], {
      message: "Worth keeping an eye on.",
      detail: `Your reading (${systolic}/${diastolic}) is slightly elevated. Try resting on your left side, drink some water, and re-measure in 30 minutes.`,
      primary: { label: "Got it", kind: "dismiss" },
      secondary: [{ label: "Show me what to say", kind: "self_advocacy" }],
    });
  }

  return makeEvaluation("green", [], {
    message: "Looking good.",
    detail: `Your reading (${systolic}/${diastolic}) is in a healthy range.`,
    primary: { label: "Done", kind: "dismiss" },
    secondary: [],
  });
}

/**
 * Evaluate a symptom report.
 */
export function evaluateSymptoms(report: SymptomReport): KpinEvaluation {
  const flagged = report.symptoms.filter((s) => RED_FLAG_SYMPTOMS.includes(s));

  if (flagged.length > 0 || report.severity === "severe") {
    const triggers: KpinTriggerSource[] = flagged.map(symptomToTrigger);
    return makeEvaluation("red", triggers, {
      message: "These symptoms need attention.",
      detail: `You mentioned ${flagged.join(", ") || "severe symptoms"}. During pregnancy, these can signal something serious. Please contact your provider now.`,
      primary: { label: "Call my OB", kind: "call_ob" },
      secondary: [
        { label: "Go to ER", kind: "call_er" },
        { label: "Show me what to say", kind: "self_advocacy" },
      ],
    });
  }

  if (report.severity === "moderate") {
    return makeEvaluation("yellow", [], {
      message: "Let's track this.",
      detail: "Moderate symptoms are worth watching. Re-check in a few hours and reach out to your provider if they don't improve.",
      primary: { label: "Got it", kind: "dismiss" },
      secondary: [],
    });
  }

  return makeEvaluation("green", [], {
    message: "Noted.",
    detail: "Mild symptoms are common in pregnancy. We'll log this for your records.",
    primary: { label: "Done", kind: "dismiss" },
    secondary: [],
  });
}

/**
 * How recent the previous camera reading must be to confirm this one. Long
 * enough to rest a few minutes and re-measure, short enough that both
 * readings describe the same episode.
 */
export const RPPG_CONFIRM_WINDOW_MS = 30 * 60 * 1000;

/**
 * Two separate camera readings are at least one 20 s recording apart; closer
 * ones are the same reading saved twice (e.g. a double-tapped Save button).
 */
const RPPG_MIN_GAP_MS = 20 * 1000;

/**
 * Evaluate an rPPG measurement.
 *
 * A camera estimate can be misread (e.g. the pulse's harmonic at 2x the
 * heart rate), so one reading never raises red on its own: a very high
 * first reading asks the user to rest and re-measure, and red needs the
 * user's previous camera reading — taken shortly before — to be very high too.
 */
export function evaluateRppg(vitals: VitalsLog, previous: VitalsLog | null = null): KpinEvaluation {
  if (!vitals.heartRate) {
    return makeEvaluation("green", [], {
      message: "Reading saved.",
      detail: "No heart rate detected to evaluate.",
      primary: { label: "Done", kind: "dismiss" },
      secondary: [],
    });
  }

  const t = KPIN_THRESHOLDS.hr;
  const hr = vitals.heartRate;
  const prior = recentEarlierHeartRate(vitals, previous);

  if (hr >= t.severeBpm && prior !== null && prior >= t.severeBpm) {
    return makeEvaluation("red", ["hr_elevated"], {
      message: "Your heart rate is high.",
      detail: `Two readings in a row (${prior} and ${hr} BPM, estimated) are well above the typical range during pregnancy. Please contact your OB.`,
      primary: { label: "Call my OB", kind: "call_ob" },
      secondary: [{ label: "Re-measure", kind: "dismiss" }],
    });
  }

  if (hr >= t.elevatedBpm && prior !== null && prior >= t.elevatedBpm) {
    return makeEvaluation("yellow", ["hr_elevated"], {
      message: "Elevated heart rate on two readings.",
      detail: `${prior} and ${hr} BPM (estimated) are above the typical range. Rest, and contact your OB if it stays high or you feel unwell.`,
      primary: { label: "Got it", kind: "dismiss" },
      secondary: [],
    });
  }

  if (hr >= t.severeBpm) {
    return makeEvaluation("yellow", ["hr_elevated"], {
      message: "That reading was high.",
      detail: `An estimated ${hr} BPM. Camera readings can be thrown off by movement or lighting. Sit quietly for 5 minutes, then measure again.`,
      primary: { label: "Got it", kind: "dismiss" },
      secondary: [],
    });
  }

  if (hr >= t.elevatedBpm) {
    return makeEvaluation("yellow", ["hr_elevated"], {
      message: "Slightly elevated heart rate.",
      detail: `An estimated ${vitals.heartRate} BPM is on the higher side. Rest for a few minutes and try measuring again.`,
      primary: { label: "Got it", kind: "dismiss" },
      secondary: [],
    });
  }

  return makeEvaluation("green", [], {
    message: "Heart rate looks normal.",
    detail: `An estimated ${vitals.heartRate} BPM.`,
    primary: { label: "Done", kind: "dismiss" },
    secondary: [],
  });
}

/**
 * Combine multiple recent signals into an overall dashboard level.
 * Used for the risk score card on the home screen.
 */
export function summarizeKpin(evaluations: KpinEvaluation[]): KpinLevel {
  if (evaluations.some((e) => e.level === "red")) return "red";
  if (evaluations.some((e) => e.level === "yellow")) return "yellow";
  return "green";
}

// ---- helpers ----------------------------------------------------------

/** The previous reading's heart rate if it is a separate reading taken shortly before `current`. */
function recentEarlierHeartRate(current: VitalsLog, previous: VitalsLog | null): number | null {
  if (!previous?.heartRate) return null;
  const gapMs = Date.parse(current.measuredAt) - Date.parse(previous.measuredAt);
  return gapMs >= RPPG_MIN_GAP_MS && gapMs <= RPPG_CONFIRM_WINDOW_MS ? previous.heartRate : null;
}

function symptomToTrigger(symptom: SymptomKey): KpinTriggerSource {
  switch (symptom) {
    case "chest_pain":
      return "symptom_chest_pain";
    case "vision_changes":
      return "symptom_vision_changes";
    case "shortness_of_breath":
      return "symptom_shortness_of_breath";
    case "swelling":
      return "symptom_swelling_severe";
    case "headache":
      return "symptom_headache_severe";
    case "severe_abdominal_pain":
      return "symptom_abdominal_pain_severe";
    case "decreased_fetal_movement":
      return "symptom_decreased_fetal_movement";
    default:
      return "voice_journal_concern";
  }
}

interface EvaluationCopy {
  message: string;
  detail: string;
  primary: KpinAction;
  secondary: KpinAction[];
}

function makeEvaluation(
  level: KpinLevel,
  triggers: KpinTriggerSource[],
  copy: EvaluationCopy,
): KpinEvaluation {
  return {
    level,
    triggers,
    message: copy.message,
    detail: copy.detail,
    primaryAction: copy.primary,
    secondaryActions: copy.secondary,
  };
}
