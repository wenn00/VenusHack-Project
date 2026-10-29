/**
 * /demo — one-tap entry for conference visitors (the QR code points here).
 *
 * Signs a new visitor in anonymously. UserDataContext then seeds the demo
 * persona and RootGate routes to the dashboard once that data has loaded,
 * so this screen never navigates by itself. A returning visitor keeps their
 * existing session — and therefore the same persona.
 */

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { demoEntryAction } from "@/lib/demo-mode";
import { colors, spacing } from "@/theme";

export default function DemoEntryScreen() {
  const { session, isLoading, signInAnonymous } = useAuth();
  const [failed, setFailed] = useState(false);
  // Effects can re-run (dev double-invoke, session refresh); one visit must
  // never create two anonymous users.
  const startedRef = useRef(false);

  function startDemo() {
    startedRef.current = true;
    signInAnonymous().catch((err) => {
      console.warn("[demo] anonymous sign-in failed:", err);
      startedRef.current = false;
      setFailed(true);
    });
  }

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    if (demoEntryAction(session) !== "sign_in") return;
    startDemo();
    // startDemo only closes over the stable signInAnonymous for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session]);

  if (failed) {
    return (
      <Screen contentStyle={styles.screen}>
        <Heading level={2}>Couldn&apos;t start the demo</Heading>
        <Body tone="muted">Please try again.</Body>
        <Button
          label="Try again"
          onPress={() => {
            setFailed(false);
            startDemo();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent.rose} />
        <Heading level={2}>Setting up a demo with sample data…</Heading>
        <Body tone="muted">
          This demo uses a made-up profile. Please don&apos;t enter your own health information.
        </Body>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 40,
    paddingTop: 120,
    gap: spacing.md,
  },
  center: {
    gap: spacing.md,
  },
});
