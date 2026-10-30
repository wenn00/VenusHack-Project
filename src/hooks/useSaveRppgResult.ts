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

const VITALS_COLUMNS =
  "id, user_id, measurement_type, heart_rate, hrv_ms, spo2, confidence_score, measured_at";

interface VitalsRow {
  id: string;
  user_id: string;
  measurement_type: VitalsLog["measurementType"];
  heart_rate: number | null;
  hrv_ms: number | null;
  spo2: number | null;
  confidence_score: number | null;
  measured_at: string;
}

function toVitalsLog(row: VitalsRow): VitalsLog {
  return {
    id: row.id,
    userId: row.user_id,
    measurementType: row.measurement_type,
    heartRate: row.heart_rate,
    hrvMs: row.hrv_ms,
    spo2: row.spo2,
    confidenceScore: row.confidence_score,
    measuredAt: row.measured_at,
  };
}

export function useSaveRppgResult(): (result: RppgResult) => Promise<void> {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const { evaluateAndDispatchRppg } = useKpin();

  return useCallback(
    async (result: RppgResult) => {
      if (!user) return;

      const measuredAt = new Date().toISOString();

      try {
        // The user's last camera reading, fetched before this one is saved,
        // lets KPIN tell a confirmed high heart rate from a one-off misread.
        // A failed lookup only means "no confirmation" — never a red alert.
        const { data: previousRow } = await supabase
          .from("vitals_log")
          .select(VITALS_COLUMNS)
          .eq("user_id", user.id)
          .eq("measurement_type", "rppg")
          .order("measured_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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
          .select(VITALS_COLUMNS)
          .single();

        if (error) throw error;

        const evaluation = evaluateAndDispatchRppg(
          toVitalsLog(data),
          previousRow ? toVitalsLog(previousRow) : null,
        );
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
