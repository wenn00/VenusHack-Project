/**
 * useKpin — convenience hook that lets a screen run an evaluation and
 * push the result into UserDataContext. If the evaluation is red, the
 * caller is expected to route the user to /alert/red-flag.
 */

import { useCallback } from "react";
import { router } from "expo-router";
import { useUserData } from "@/contexts/UserDataContext";
import { evaluateBp, evaluateRppg, evaluateSymptoms } from "@/lib/kpin";
import { BpReading, KpinEvaluation, SymptomReport, VitalsLog } from "@/types";

export function useKpin() {
  const { pushKpinEvaluation, kpinLevel } = useUserData();

  const handleEvaluation = useCallback(
    (evaluation: KpinEvaluation) => {
      pushKpinEvaluation(evaluation);
      if (evaluation.level === "red") {
        router.push({
          pathname: "/alert/red-flag",
          params: {
            message: evaluation.message,
            detail: evaluation.detail,
          },
        });
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
    evaluateAndDispatchRppg: (vitals: VitalsLog) => {
      const ev = evaluateRppg(vitals);
      handleEvaluation(ev);
      return ev;
    },
  };
}
