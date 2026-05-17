/**
 * Camera-based rPPG (remote photoplethysmography) measurement.
 *
 * Flow:
 *   1. Ask for camera permission if we don't have it.
 *   2. Ping the rPPG backend on mount and gate the Start button until it
 *      responds. Render's free tier can take ~50 seconds to spin up.
 *   3. User taps "Start" → CameraView records 20 seconds of front-facing video.
 *   4. Video file is uploaded to the FastAPI service.
 *   5. The backend returns { bpm, hrv_ms, confidence }.
 *   6. We persist a row to `vitals_log` and run a KPIN evaluation,
 *      which may navigate to the red-flag alert screen.
 *
 * Notes on accuracy: rPPG from a phone camera is an estimate. We label it
 * as such in the UI and never use it for clinical decisions — KPIN treats
 * it as one signal among many.
 */

import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useKpin } from "@/hooks/useKpin";
import { measureRppg, pingRppg } from "@/services/rppg";
import { supabase } from "@/services/supabase";
import { RppgError, RppgResult, VitalsLog } from "@/types";
import { colors, radius, spacing } from "@/theme";

type Stage = "idle" | "recording" | "analyzing" | "result" | "error";
type ServerState = "warming" | "ready" | "unreachable";

const RECORD_SECONDS = 20;

export default function CameraRppgScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();
  const { refresh } = useUserData();
  const { evaluateAndDispatchRppg } = useKpin();

  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [serverState, setServerState] = useState<ServerState>("warming");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [result, setResult] = useState<RppgResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wake up Render's free-tier dyno BEFORE the user records.
  // The first ping after sleep can take up to ~50 seconds.
  useEffect(() => {
    let cancelled = false;
    setServerState("warming");
    pingRppg()
      .then((ok) => {
        if (cancelled) return;
        setServerState(ok ? "ready" : "unreachable");
      })
      .catch(() => {
        if (cancelled) return;
        setServerState("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // If the user navigates away mid-recording, stop the recording gracefully.
  useFocusEffect(
    useCallback(() => {
      return () => {
        cameraRef.current?.stopRecording();
      };
    }, []),
  );

  if (!permission) {
    return (
      <Screen>
        <Card>
          <ActivityIndicator />
          <Body tone="muted">Loading camera...</Body>
        </Card>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Heading level={2}>Camera access needed</Heading>
        <Body tone="muted">
          Kairos needs the front camera to estimate your heart rate.
          Your video is sent to our analysis server and never stored.
        </Body>
        <Button
          label="Grant access"
          onPress={async () => {
            const next = await requestPermission();
            if (!next.granted && !next.canAskAgain) {
              Alert.alert(
                "Open Settings",
                "Camera access was denied. Enable it in Settings to continue.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Open Settings", onPress: () => Linking.openSettings() },
                ],
              );
            }
          }}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function handleStart() {
    if (!cameraRef.current) return;

    setStage("recording");
    setSecondsLeft(RECORD_SECONDS);
    setErrorMessage(null);

    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, RECORD_SECONDS - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(tick);
    }, 200);

    try {
      const promise = cameraRef.current.recordAsync({
        maxDuration: RECORD_SECONDS,
      });
      recordingPromiseRef.current = promise;
      const video = await promise;
      clearInterval(tick);

      if (!video?.uri) {
        throw new RppgError("LOW_QUALITY_VIDEO", "Recording produced no file.");
      }

      setStage("analyzing");
      const rppg = await measureRppg(video.uri);
      setResult(rppg);
      setStage("result");
    } catch (err) {
      clearInterval(tick);
      const message =
        err instanceof RppgError ? err.message : (err as Error)?.message ?? "Unknown error";
      setErrorMessage(message);
      setStage("error");
    }
  }

  function handleCancel() {
    cameraRef.current?.stopRecording();
    setStage("idle");
  }

  async function handleSave() {
    if (!result || !user) return;

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

      if (evaluation.level !== "red") {
        router.back();
      }
    } catch (err) {
      Alert.alert("Could not save", (err as Error).message);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (stage === "result" && result) {
    return (
      <Screen>
        <Heading level={2}>Result</Heading>
        <Card>
          <Body tone="muted">Heart rate</Body>
          <Heading level={1}>{result.bpm} bpm</Heading>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Body tone="muted" size="sm">
                Confidence
              </Body>
              <Heading level={3}>{Math.round(result.confidence * 100)}%</Heading>
            </View>
          </View>
        </Card>
        <Body tone="muted" size="sm">
          Estimated values from rPPG. For reference only — not a clinical device.
        </Body>
        <Button label="Save" onPress={handleSave} />
        <Button
          label="Re-measure"
          variant="ghost"
          onPress={() => {
            setResult(null);
            setStage("idle");
          }}
        />
      </Screen>
    );
  }

  if (stage === "error") {
    return (
      <Screen>
        <Heading level={2}>Something went wrong</Heading>
        <Card>
          <Body>{errorMessage ?? "Couldn't complete the measurement."}</Body>
        </Card>
        <Body tone="muted" size="sm">
          {serverState === "unreachable"
            ? "The analysis server isn't reachable. Check your internet, then try again."
            : "Try again — the analysis server should be warm now."}
        </Body>
        <Button
          label="Try again"
          onPress={() => {
            setErrorMessage(null);
            setStage("idle");
          }}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const startDisabled = stage !== "idle" || serverState !== "ready";

  return (
    <Screen scroll={false} contentStyle={styles.cameraContainer}>
      <View style={styles.cameraFrame}>
        <CameraView
          ref={cameraRef}
          facing="front"
          mode="video"
          videoQuality="720p"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.faceGuide} />
        {stage === "recording" && (
          <View pointerEvents="none" style={styles.countdownBadge}>
            <Heading level={1} style={styles.countdownText}>
              {secondsLeft}
            </Heading>
          </View>
        )}
        {stage === "analyzing" && (
          <View pointerEvents="none" style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={colors.accent.rose} />
            <Body style={styles.analyzingText}>Analyzing...</Body>
            <Body style={styles.analyzingHint} size="sm">
              First measurement of the day can take 30-60 seconds.
            </Body>
          </View>
        )}
      </View>

      {stage === "idle" && (
        <View style={styles.controls}>
          <Card>
            <Heading level={3}>How it works</Heading>
            <Body tone="muted">
              Hold your phone steady at eye level. Keep your face inside the
              circle. Stay still for {RECORD_SECONDS} seconds.
            </Body>
            <Body tone="muted" size="sm">
              Best in bright, even light — daylight near a window works well.
            </Body>
          </Card>

          <View style={styles.serverBadge}>
            <View
              style={[
                styles.serverDot,
                serverState === "ready" && styles.serverDotReady,
                serverState === "warming" && styles.serverDotWarming,
                serverState === "unreachable" && styles.serverDotError,
              ]}
            />
            <Body size="sm" tone="muted">
              {serverState === "warming"
                ? "Waking up analysis server (up to 1 minute)..."
                : serverState === "ready"
                  ? "Analysis server ready."
                  : "Analysis server unreachable — check connection."}
            </Body>
          </View>

          <Button
            label={
              serverState === "warming"
                ? "Waking up server..."
                : serverState === "unreachable"
                  ? "Retry connection"
                  : "Start measurement"
            }
            onPress={() => {
              if (serverState === "unreachable") {
                setServerState("warming");
                pingRppg().then((ok) => setServerState(ok ? "ready" : "unreachable"));
              } else {
                handleStart();
              }
            }}
            disabled={startDisabled}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      )}

      {stage === "recording" && (
        <View style={styles.controls}>
          <Body style={styles.holdMessage}>Hold still — measuring your heart rate</Body>
          <Pressable onPress={handleCancel}>
            <Body tone="muted" size="sm" style={styles.cancelText}>
              Cancel
            </Body>
          </Pressable>
        </View>
      )}

      {stage === "analyzing" && (
        <View style={styles.controls}>
          <Body style={styles.holdMessage}>Analyzing your reading...</Body>
        </View>
      )}
    </Screen>
  );
}

const FACE_GUIDE_SIZE = 240;

const styles = StyleSheet.create({
  cameraContainer: {
    padding: 0,
    gap: 0,
  },
  cameraFrame: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  faceGuide: {
    position: "absolute",
    top: "20%",
    alignSelf: "center",
    width: FACE_GUIDE_SIZE,
    height: FACE_GUIDE_SIZE * 1.25,
    borderRadius: FACE_GUIDE_SIZE,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
    borderStyle: Platform.OS === "ios" ? "dashed" : "solid",
  },
  countdownBadge: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  countdownText: {
    color: "#fff",
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  analyzingText: {
    color: "#fff",
  },
  analyzingHint: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  controls: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bg.page,
  },
  holdMessage: {
    textAlign: "center",
  },
  cancelText: {
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  stat: {
    minWidth: 100,
  },
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fg.muted,
  },
  serverDotReady: { backgroundColor: colors.status.green },
  serverDotWarming: { backgroundColor: colors.status.yellow },
  serverDotError: { backgroundColor: colors.status.red },
});
