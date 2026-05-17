/**
 * Dashboard — placeholder skeleton with the structure from
 * docs/06-screens-spec.md. UI styling will be polished once the
 * designer's spec is in.
 */

import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { useMockHealthKit } from "@/hooks/useMockHealthKit";
import { useMoodStreak } from "@/hooks/useMoodStreak";
import { colors, spacing } from "@/theme";

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { profile, kpinLevel, baselineEvaluation } = useUserData();
  const vitals = useMockHealthKit();
  const { hasLoggedToday, streak, todayEntry } = useMoodStreak();

  const firstName = profile?.fullName?.split(" ")[0] ?? "there";

  return (
    <Screen>
      <View>
        <Heading level={2}>Hi {firstName}</Heading>
        <Body tone="muted">{new Date().toDateString()}</Body>
      </View>

      <Card>
        <Heading level={3}>How are you feeling today?</Heading>
        {hasLoggedToday ? (
          <Body>
            ✓ Logged "{todayEntry?.mood}" today
            {streak > 1 ? ` · ${streak}-day streak 🔥` : ""}
          </Body>
        ) : (
          <Body tone="muted">Tap an emoji to check in.</Body>
        )}
        <Button
          label={hasLoggedToday ? "Update" : "Check in"}
          onPress={() => router.push("/(app)/log-mood")}
        />
      </Card>

      <Card style={{ backgroundColor: levelBg(kpinLevel) }}>
        <Heading level={3}>Risk level: {kpinLevel.toUpperCase()}</Heading>
        <Body tone="muted">KPIN — Key Pregnancy Indicator Network</Body>
        {baselineEvaluation && (
          <Body size="sm" style={{ marginTop: spacing.sm }}>
            {baselineEvaluation.detail}
          </Body>
        )}
      </Card>

      <Card>
        <Heading level={3}>Live vitals</Heading>
        <View style={styles.vitalsRow}>
          <Stat label="Heart rate" value={`${vitals.heartRate} bpm`} />
          <Stat label="BP" value={`${vitals.systolic}/${vitals.diastolic}`} />
          <Stat label="HRV" value={`${vitals.hrvMs} ms`} />
          <Stat label="Sleep" value={`${vitals.sleepHours} h`} />
        </View>
      </Card>

      <View style={styles.actionsRow}>
        <Button label="Log BP" onPress={() => router.push("/(app)/log-bp")} variant="secondary" />
        <Button
          label="Measure HR"
          onPress={() => router.push("/(app)/camera-rppg")}
          variant="secondary"
        />
      </View>
      <View style={styles.actionsRow}>
        <Button
          label="Voice journal"
          onPress={() => router.push("/(app)/voice-journal")}
          variant="secondary"
        />
        <Button
          label="Doctor visit"
          onPress={() => router.push("/(app)/doctor-prep")}
          variant="secondary"
        />
      </View>

      <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Body tone="muted" size="sm">
        {label}
      </Body>
      <Heading level={3}>{value}</Heading>
    </View>
  );
}

function levelBg(level: string): string {
  if (level === "red") return colors.status.redBg;
  if (level === "yellow") return colors.status.yellowBg;
  return colors.status.greenBg;
}

const styles = StyleSheet.create({
  vitalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  stat: {
    minWidth: 120,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
