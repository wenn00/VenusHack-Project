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
 * Evaluate an rPPG measurement.
 */
export function evaluateRppg(vitals: VitalsLog): KpinEvaluation {
  if (!vitals.heartRate) {
    return makeEvaluation("green", [], {
      message: "Reading saved.",
      detail: "No heart rate detected to evaluate.",
      primary: { label: "Done", kind: "dismiss" },
      secondary: [],
    });
  }

  const t = KPIN_THRESHOLDS.hr;

  if (vitals.heartRate >= t.severeBpm) {
    return makeEvaluation("red", ["hr_elevated"], {
      message: "Your heart rate is high.",
      detail: `An estimated ${vitals.heartRate} BPM is well above the typical range during pregnancy. Please contact your OB.`,
      primary: { label: "Call my OB", kind: "call_ob" },
      secondary: [{ label: "Re-measure", kind: "dismiss" }],
    });
  }

  if (vitals.heartRate >= t.elevatedBpm) {
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
