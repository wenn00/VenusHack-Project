/**
 * Manual blood pressure entry.
 *
 * Flow: validate → save row → run KPIN evaluation → if red, navigate
 * to /alert/red-flag (handled by useKpin), otherwise pop back.
 */

import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useKpin } from "@/hooks/useKpin";
import { useAuth } from "@/contexts/AuthContext";
import { BpReading } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";

export default function LogBpScreen() {
  const { user } = useAuth();
  const { evaluateAndDispatchBp } = useKpin();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");

  function handleSave() {
    const s = parseInt(systolic, 10);
    const d = parseInt(diastolic, 10);
    if (!Number.isFinite(s) || !Number.isFinite(d)) {
      Alert.alert("Missing values", "Please enter both systolic and diastolic.");
      return;
    }

    const reading: BpReading = {
      id: `local-${Date.now()}`,
      userId: user?.id ?? "anonymous",
      systolic: s,
      diastolic: d,
      pulse: pulse ? parseInt(pulse, 10) : null,
      measuredAt: new Date().toISOString(),
      source: "manual",
      notes: null,
    };

    // TODO: persist to Supabase bp_readings table.
    const ev = evaluateAndDispatchBp(reading);
    if (ev.level !== "red") {
      router.back();
    }
  }

  return (
    <Screen>
      <Heading level={2}>Log blood pressure</Heading>
      <Card>
        <View style={styles.field}>
          <Body tone="muted" size="sm">
            Systolic (top)
          </Body>
          <TextInput
            value={systolic}
            onChangeText={setSystolic}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="120"
            placeholderTextColor={colors.fg.muted}
          />
        </View>
        <View style={styles.field}>
          <Body tone="muted" size="sm">
            Diastolic (bottom)
          </Body>
          <TextInput
            value={diastolic}
            onChangeText={setDiastolic}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="80"
            placeholderTextColor={colors.fg.muted}
          />
        </View>
        <View style={styles.field}>
          <Body tone="muted" size="sm">
            Pulse (optional)
          </Body>
          <TextInput
            value={pulse}
            onChangeText={setPulse}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="72"
            placeholderTextColor={colors.fg.muted}
          />
        </View>
      </Card>
      <Button label="Save" onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.size.lg,
    color: colors.fg.primary,
    backgroundColor: colors.bg.muted,
  },
});
