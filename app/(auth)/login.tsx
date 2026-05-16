/**
 * Login screen — placeholder.
 *
 * Owner: teammate. Will wire up Supabase Google OAuth here.
 * For now, "Continue" sets a local stub session so the rest of
 * the team can develop without auth working yet.
 */

import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme";

export default function LoginScreen() {
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
        <Button
          label="Continue with Google"
          onPress={() => router.replace("/(auth)/intake-pregnancy")}
        />
        <Button
          label="Skip for now (dev)"
          variant="ghost"
          onPress={() => router.replace("/(app)/dashboard")}
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
