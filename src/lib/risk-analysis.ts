import {
  UserProfile,
  PregnancyHistory,
  FamilyHistory,
  KpinEvaluation,
  KpinLevel
} from "@/types";

/**
 * Analyzes survey data to determine a baseline risk level for the user.
 * This forms the "floor" of their risk score.
 */
export function evaluateBaselineRisk(
  profile: UserProfile | null,
  pregHistory: PregnancyHistory | null,
  familyHistory: FamilyHistory | null
): KpinEvaluation {
  const triggers: any[] = [];
  let level: KpinLevel = "green";
  let message = "Your baseline risk is normal.";
  let detail = "Based on your history, you are at standard risk. Keep tracking your vitals regularly.";

  // 1. Check Pregnancy History (High Risk)
  if (pregHistory) {
    if (pregHistory.hadPreeclampsia || pregHistory.hadEclampsia) {
      level = "red";
      triggers.push("history_preeclampsia");
      message = "High baseline risk detected.";
      detail = "Due to your history of preeclampsia or eclampsia, we will monitor your vitals more closely.";
    } else if (
      pregHistory.hadGestationalHypertension ||
      pregHistory.hadGestationalDiabetes ||
      pregHistory.hadPretermBirth
    ) {
      if (level !== "red") {
        level = "yellow";
        message = "Elevated baseline risk.";
        detail = "Your history of pregnancy complications means we should be extra vigilant with your tracking.";
      }
    }
  }

  // 2. Check Stage (Contextual Risk)
  if (profile?.stage === "postpartum" && level !== "red") {
    // Postpartum is a high-risk period for cardiovascular events
    level = "yellow";
    message = "Postpartum monitoring active.";
    detail = "The postpartum period requires close heart health monitoring. Ensure you log your BP daily.";
  }

  // 3. Check Family History
  if (familyHistory && level === "green") {
    if (
      familyHistory.hasCvdFamily ||
      familyHistory.hasHypertensionFamily ||
      familyHistory.hasStrokeFamily
    ) {
      level = "yellow";
      message = "Family history factor.";
      detail = "Your family history of heart conditions puts you in an elevated monitoring group.";
    }
  }

  return {
    level,
    triggers,
    message,
    detail,
    primaryAction: { label: "View Recommendations", kind: "dismiss" }, // Placeholder
    secondaryActions: [],
  };
}
