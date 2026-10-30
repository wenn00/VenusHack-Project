import { PageTitle } from "@/components/ui/PageTitle";
/**
 * Web camera heart-rate measurement.
 *
 * expo-camera cannot record video in browsers, so the web build records the
 * front camera itself (getUserMedia + MediaRecorder, see web-recorder.ts)
 * and uploads the clip to the same rPPG backend as the native app. The free
 * backend runs one measurement at a time, so the copy sets a ~1 minute
 * expectation and SERVER_BUSY gets its own hint.
 */

import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useSaveRppgResult } from "@/hooks/useSaveRppgResult";
import {
  fileNameForMimeType,
  pickRecorderMimeType,
  recordStream,
  WEB_RECORDING_CONSTRAINTS,
} from "@/lib/web-recorder";
import { measureRppgBlob, pingRppg } from "@/services/rppg";
import { RppgError, RppgErrorCode, RppgResult } from "@/types";
import { colors, radius, spacing } from "@/theme";

type Stage = "unsupported" | "starting" | "denied" | "idle" | "recording" | "analyzing" | "result" | "error";
type ServerState = "warming" | "ready" | "unreachable";

const RECORD_SECONDS = 20;

function supportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  return pickRecorderMimeType((type) => MediaRecorder.isTypeSupported(type));
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function WebCameraRppg() {
  const saveResult = useSaveRppgResult();
  const [mimeType] = useState(supportedMimeType);
  const [stage, setStage] = useState<Stage>(mimeType ? "starting" : "unsupported");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [serverState, setServerState] = useState<ServerState>("warming");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [result, setResult] = useState<RppgResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<RppgErrorCode | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The preview element remounts when the screen switches between stages,
  // so attach the live stream whenever it (re)appears.
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    const stream = streamRef.current;
    if (element && stream && element.srcObject !== stream) {
      element.srcObject = stream;
      void element.play().catch(() => undefined);
    }
  }, []);

  // Wake the Render dyno before the visitor records (see the native screen).
  useEffect(() => {
    let cancelled = false;
    pingRppg()
      .then((ok) => {
        if (!cancelled) setServerState(ok ? "ready" : "unreachable");
      })
      .catch(() => {
        if (!cancelled) setServerState("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Open the front camera; runs again when the visitor retries after a denial.
  useEffect(() => {
    if (!mimeType) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia(WEB_RECORDING_CONSTRAINTS).then(
      (stream) => {
        if (cancelled) {
          stopTracks(stream);
          return;
        }
        streamRef.current = stream;
        attachVideo(videoRef.current);
        setStage("idle");
      },
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setStage("denied");
        } else {
          setErrorCode(null);
          setErrorMessage("Couldn't open the camera.");
          setStage("error");
        }
      },
    );
    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (streamRef.current) {
        stopTracks(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [mimeType, cameraAttempt, attachVideo]);

  function reopenCamera() {
    setStage("starting");
    setCameraAttempt((attempt) => attempt + 1);
  }

  async function handleStart() {
    const stream = streamRef.current;
    if (!stream || !mimeType) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStage("recording");
    setSecondsLeft(RECORD_SECONDS);
    setErrorMessage(null);
    setErrorCode(null);

    const startedAt = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, RECORD_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(tick);
    }, 200);

    try {
      const clip = await recordStream(stream, mimeType, RECORD_SECONDS, controller.signal);
      clearInterval(tick);
      setStage("analyzing");
      const rppg = await measureRppgBlob(clip, fileNameForMimeType(mimeType));
      if (controller.signal.aborted) return;
      setResult(rppg);
      setStage("result");
    } catch (err) {
      clearInterval(tick);
      // Cancelled or left the screen: the clip is discarded, never uploaded.
      if (controller.signal.aborted) return;
      setErrorCode(err instanceof RppgError ? err.code : null);
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStage("error");
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setStage("idle");
  }

  if (stage === "unsupported") {
    return (
      <Screen>
        <PageTitle>Camera measurement unavailable</PageTitle>
        <Body tone="muted">
          This browser can&apos;t record video. Try the latest Safari or Chrome, or use the mobile app.
        </Body>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (stage === "denied") {
    return (
      <Screen>
        <PageTitle>Camera access needed</PageTitle>
        <Body tone="muted">
          Camera access was blocked. Allow camera access for this site in your browser settings, then try again.
        </Body>
        <Button label="Try again" onPress={reopenCamera} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (stage === "result" && result) {
    return (
      <Screen>
        <PageTitle>Result</PageTitle>
        <Card>
          <Body tone="muted">Heart rate</Body>
          <Heading level={1}>{result.bpm} bpm</Heading>
          <Body tone="muted" size="sm">
            Confidence
          </Body>
          <Heading level={3}>{Math.round(result.confidence * 100)}%</Heading>
        </Card>
        <Body tone="muted" size="sm">
          Estimated values from rPPG. For reference only — not a clinical device.
        </Body>
        <Button label="Save" onPress={() => void saveResult(result)} />
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
        <PageTitle>Something went wrong</PageTitle>
        <Card>
          <Body>{errorMessage ?? "Couldn't complete the measurement."}</Body>
        </Card>
        <Body tone="muted" size="sm">
          {errorCode === "FACE_NOT_DETECTED" || errorCode === "LOW_QUALITY_VIDEO"
            ? "Keep your face inside the circle and try again in bright, even light."
            : errorCode === "SERVER_BUSY"
              ? "Someone else is measuring right now. Wait a minute, then try again."
              : serverState === "unreachable"
                ? "The analysis server isn't reachable. Check your internet, then try again."
                : "Try again — the analysis server should be warm now."}
        </Body>
        <Button
          label="Try again"
          onPress={() => {
            setErrorMessage(null);
            setErrorCode(null);
            if (streamRef.current) setStage("idle");
            else reopenCamera();
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
        <video ref={attachVideo} autoPlay muted playsInline style={videoStyle} />
        <View pointerEvents="none" style={styles.faceGuide} />
        {stage === "starting" && (
          <View pointerEvents="none" style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent.rose} />
            <Body style={styles.overlayText}>Opening the camera…</Body>
          </View>
        )}
        {stage === "recording" && (
          <View pointerEvents="none" style={styles.countdownBadge}>
            <Heading level={1} style={styles.countdownText}>
              {secondsLeft}
            </Heading>
          </View>
        )}
        {stage === "analyzing" && (
          <View pointerEvents="none" style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent.rose} />
            <Body style={styles.overlayText}>Analyzing… this can take about a minute.</Body>
          </View>
        )}
      </View>

      {(stage === "idle" || stage === "starting") && (
        <View style={styles.controls}>
          <Card>
            <Heading level={3}>How it works</Heading>
            <Body tone="muted">
              Hold your phone steady at eye level. Keep your face inside the circle. Stay still for{" "}
              {RECORD_SECONDS} seconds.
            </Body>
            <Body tone="muted" size="sm">
              Best in bright, even light. The analysis takes about a minute.
            </Body>
          </Card>
          <Body size="sm" tone="muted">
            {serverState === "warming"
              ? "Waking up analysis server (up to 1 minute)..."
              : serverState === "ready"
                ? "Analysis server ready."
                : "Analysis server unreachable — check connection."}
          </Body>
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
                void handleStart();
              }
            }}
            disabled={serverState === "unreachable" ? false : startDisabled}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      )}

      {stage === "recording" && (
        <View style={styles.controls}>
          <Body style={styles.centerText}>Hold still — measuring your heart rate</Body>
          <Pressable onPress={handleCancel}>
            <Body tone="muted" size="sm" style={styles.centerText}>
              Cancel
            </Body>
          </Pressable>
        </View>
      )}

      {stage === "analyzing" && (
        <View style={styles.controls}>
          <Body style={styles.centerText}>Analyzing your reading...</Body>
        </View>
      )}
    </Screen>
  );
}

const FACE_GUIDE_SIZE = 240;

// Mirrored like a selfie camera; cover-fit fills the frame on any phone.
const videoStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transform: "scaleX(-1)",
} as const;

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
    borderStyle: "dashed",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  overlayText: {
    color: "#fff",
    textAlign: "center",
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
  controls: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bg.page,
  },
  centerText: {
    textAlign: "center",
  },
});
