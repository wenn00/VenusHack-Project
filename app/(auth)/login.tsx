/**
 * Login screen.
 *
 * "Skip for now (dev)" performs an anonymous Supabase sign-in so the
 * rest of the app has a real session and RLS-scoped inserts work.
 *
 * Google OAuth will be wired up by the auth-track teammate.
 */

import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { spacing } from "@/theme";

export default function LoginScreen() {
  const { signInAnonymous } = useAuth();
  const [isBusy, setIsBusy] = useState(false);

  async function handleDevSkip() {
    console.log("[login] starting anonymous sign-in...");
    setIsBusy(true);
    try {
      await signInAnonymous();
      console.log("[login] anonymous sign-in succeeded, RootGate will redirect.");
      // Intentionally NOT calling router.replace here; RootGate watches
      // the session and routes to /(app)/dashboard once it becomes truthy.
    } catch (err) {
      console.log("[login] anonymous sign-in failed:", err);
      Alert.alert(
        "Anonymous sign-in failed",
        `${(err as Error).message}\n\nEnable Anonymous Sign-ins in your Supabase dashboard:\nAuthentication > Sign In / Providers > Anonymous Sign-Ins > Enable.`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleGoogle() {
    Alert.alert("Google sign-in", "Google OAuth will be wired up by the auth-track teammate.");
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Heading level={1}>Kairos</Heading>
        <Body tone="muted" size="lg">
          Heart health, made personal — for every step of your pregnancy.
        </Body>
      </View>

      <Card>
        <Heading level={3}>Welcome</Heading>
        <Body tone="muted">
          Sign in to start tracking your vitals, mood, and symptoms with
          gentle, intelligent support.
        </Body>
        <Button label="Continue with Google" onPress={handleGoogle} disabled={isBusy} />
        <Button
          label={isBusy ? "Signing in..." : "Skip for now (dev)"}
          variant="ghost"
          onPress={handleDevSkip}
          disabled={isBusy}
        />
        <Button
          label="Don't have an account? Sign Up"
          variant="ghost"
          onPress={() => router.push("/(auth)/signup")}
        />
      </Card>

      <Body tone="muted" size="sm">
        By continuing you agree to our Terms and Privacy Policy.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
});
