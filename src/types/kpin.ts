/**
 * KPIN — Key Pregnancy Indicator Network.
 * Risk evaluation outputs that drive the red-flag alert system.
 */

export type KpinLevel = "green" | "yellow" | "red";

export type KpinTriggerSource =
  | "bp_high"
  | "bp_diastolic_high"
  | "hr_elevated"
  | "symptom_chest_pain"
  | "symptom_headache_severe"
  | "symptom_vision_changes"
  | "symptom_shortness_of_breath"
  | "symptom_swelling_severe"
  | "voice_journal_concern"
  | "rppg_concern";

export interface KpinEvaluation {
  level: KpinLevel;
  triggers: KpinTriggerSource[];
  message: string;
  detail: string;
  primaryAction: KpinAction;
  secondaryActions: KpinAction[];
}

export interface KpinAction {
  label: string;
  kind: "call_ob" | "call_er" | "self_advocacy" | "dismiss" | "log_symptom";
}

export interface KpinEvent {
  id: string;
  userId: string;
  level: KpinLevel;
  triggerSource: KpinTriggerSource;
  triggerData: Record<string, unknown>;
  userAcknowledged: boolean;
  createdAt: string;
}
