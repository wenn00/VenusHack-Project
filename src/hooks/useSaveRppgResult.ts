/**
 * useSaveRppgResult — persist an rPPG reading and react to its KPIN
 * evaluation. Shared by the native (expo-camera) and web (MediaRecorder)
 * measurement screens so both save and alert identically.
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useKpin } from "@/hooks/useKpin";
import { supabase } from "@/services/supabase";
import { RppgResult, VitalsLog } from "@/types";

export function useSaveRppgResult(): (result: RppgResult) => Promise<void> {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const { evaluateAndDispatchRppg } = useKpin();

  return useCallback(
    async (result: RppgResult) => {
      if (!user) return;

      const measuredAt = new Date().toISOString();

      try {
        const { data, error } = await supabase
          .from("vitals_log")
          .insert({
            user_id: user.id,
            measurement_type: "rppg",
            heart_rate: result.bpm,
            hrv_ms: result.hrvMs,
            confidence_score: result.confidence,
            measured_at: measuredAt,
          })
          .select()
          .single();

        if (error) throw error;

        const vitals: VitalsLog = {
          id: data.id,
          userId: data.user_id,
          measurementType: data.measurement_type,
          heartRate: data.heart_rate,
          hrvMs: data.hrv_ms,
          spo2: data.spo2,
          confidenceScore: data.confidence_score,
          measuredAt: data.measured_at,
        };

        const evaluation = evaluateAndDispatchRppg(vitals);
        await refresh();

        if (evaluation.level === "yellow") {
          Alert.alert(evaluation.message, evaluation.detail, [
            { text: "Got it", onPress: () => router.back() },
          ]);
        } else if (evaluation.level !== "red") {
          router.back();
        }
      } catch (err) {
        Alert.alert("Could not save", (err as Error).message);
      }
    },
    [user, refresh, evaluateAndDispatchRppg],
  );
}
