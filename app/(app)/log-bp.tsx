/**
 * Manual blood pressure entry.
 *
 * Flow:
 *   1. Validate inputs.
 *   2. Insert into Supabase `bp_readings` (RLS scopes to current user).
 *   3. Run a KPIN evaluation on the new reading.
 *   4. If the result is non-green, persist a `kpin_events` row.
 *   5. If red, navigate to the red-flag screen (via useKpin).
 *   6. Refresh shared state so dashboard / log update immediately.
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
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { BpReading } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";

export default function LogBpScreen() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const { evaluateAndDispatchBp } = useKpin();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const s = parseInt(systolic, 10);
    const d = parseInt(diastolic, 10);
    if (!Number.isFinite(s) || !Number.isFinite(d)) {
      Alert.alert("Missing values", "Please enter both systolic and diastolic.");
      return;
    }
    if (!user) {
      Alert.alert("Not signed in", "Please sign in before logging readings.");
      return;
    }

    const measuredAt = new Date().toISOString();
    const pulseValue = pulse ? parseInt(pulse, 10) : null;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("bp_readings")
        .insert({
          user_id: user.id,
          systolic: s,
          diastolic: d,
          pulse: pulseValue,
          measured_at: measuredAt,
          source: "manual",
        })
        .select()
        .single();

      if (error) throw error;

      const reading: BpReading = {
        id: data.id,
        userId: data.user_id,
        systolic: data.systolic,
        diastolic: data.diastolic,
        pulse: data.pulse,
        measuredAt: data.measured_at,
        source: data.source,
        notes: data.notes,
      };

      const evaluation = evaluateAndDispatchBp(reading);

      if (evaluation.level !== "green") {
        // Audit trail for any non-green outcome. Best-effort insert; we
        // don't block the user if it fails.
        await supabase
          .from("kpin_events")
          .insert({
            user_id: user.id,
            level: evaluation.level,
            trigger_source: evaluation.triggers[0] ?? "bp_high",
            trigger_data: {
              systolic: s,
              diastolic: d,
              reading_id: data.id,
            },
            user_acknowledged: false,
          })
          .then(({ error: kpinError }) => {
            if (kpinError) console.warn("[log-bp] kpin_events insert failed:", kpinError);
          });
      }

      await refresh();

      if (evaluation.level !== "red") {
        // For red, useKpin already navigated to /alert/red-flag.
        router.back();
      }
    } catch (err) {
      Alert.alert("Could not save", (err as Error).message);
    } finally {
      setIsSaving(false);
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
            editable={!isSaving}
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
            editable={!isSaving}
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
            editable={!isSaving}
          />
        </View>
      </Card>
      <Button
        label={isSaving ? "Saving..." : "Save"}
        onPress={handleSave}
        disabled={isSaving}
      />
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
