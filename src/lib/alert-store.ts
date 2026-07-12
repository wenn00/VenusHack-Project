/**
 * In-memory handoff of the active KPIN evaluation to the red-flag screen.
 *
 * The evaluation used to travel through route params, but the app registers
 * the `kairos` scheme, so any external link
 * (kairos://alert/red-flag?message=...) could render attacker-chosen text
 * inside the first-party medical alert screen. Route params are no longer
 * rendered; a deep link now shows only the generic fallback copy.
 */

import { KpinEvaluation } from "@/types";

let activeAlert: KpinEvaluation | null = null;

export function setActiveAlert(evaluation: KpinEvaluation): void {
  activeAlert = evaluation;
}

export function getActiveAlert(): KpinEvaluation | null {
  return activeAlert;
}
