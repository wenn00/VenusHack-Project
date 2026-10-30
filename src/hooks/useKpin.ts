/**
 * useKpin — convenience hook that lets a screen run an evaluation and
 * push the result into UserDataContext. If the evaluation is red, the
 * caller is expected to route the user to /alert/red-flag.
 */

import { useCallback } from "react";
import { router } from "expo-router";
import { useUserData } from "@/contexts/UserDataContext";
import { setActiveAlert } from "@/lib/alert-store";
import { evaluateBp, evaluateRppg, evaluateSymptoms } from "@/lib/kpin";
import { BpReading, KpinEvaluation, SymptomReport, VitalsLog } from "@/types";

export function useKpin() {
  const { pushKpinEvaluation, kpinLevel } = useUserData();

  const handleEvaluation = useCallback(
    (evaluation: KpinEvaluation) => {
      pushKpinEvaluation(evaluation);
      if (evaluation.level === "red") {
        // Handed over in memory, not via route params — params can be forged
        // through the app's kairos:// scheme (see src/lib/alert-store.ts).
        setActiveAlert(evaluation);
        router.push("/alert/red-flag");
      }
    },
    [pushKpinEvaluation],
  );

  return {
    overallLevel: kpinLevel,
    evaluateAndDispatchBp: (reading: BpReading) => {
      const ev = evaluateBp(reading);
      handleEvaluation(ev);
      return ev;
    },
    evaluateAndDispatchSymptoms: (report: SymptomReport) => {
      const ev = evaluateSymptoms(report);
      handleEvaluation(ev);
      return ev;
    },
    evaluateAndDispatchRppg: (vitals: VitalsLog, previous: VitalsLog | null) => {
      const ev = evaluateRppg(vitals, previous);
      handleEvaluation(ev);
      return ev;
    },
  };
}
