import { useState } from "react";
import { StyleSheet, View, Alert, Switch } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { spacing, colors } from "@/theme";

export default function IntakeFamilyScreen() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Family History State
  const [hasCvdFamily, setHasCvdFamily] = useState(false);
  const [hasStrokeFamily, setHasStrokeFamily] = useState(false);
  const [hasDiabetesFamily, setHasDiabetesFamily] = useState(false);
  const [hasHypertensionFamily, setHasHypertensionFamily] = useState(false);

  async function handleDone() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("family_history").insert({
        user_id: user.id,
        has_cvd_family: hasCvdFamily,
        has_stroke_family: hasStrokeFamily,
        has_diabetes_family: hasDiabetesFamily,
        has_hypertension_family: hasHypertensionFamily,
      });

      if (error) throw error;

      await refresh();
      // Final destination after survey
      router.replace("/(app)/dashboard");
    } catch (err) {
      console.error("Error saving family history:", err);
      Alert.alert("Error", "Could not save family history.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const familyItems = [
    { label: "CVD (Heart Disease)", value: hasCvdFamily, setter: setHasCvdFamily },
    { label: "Stroke", value: hasStrokeFamily, setter: setHasStrokeFamily },
    { label: "Diabetes", value: hasDiabetesFamily, setter: setHasDiabetesFamily },
    { label: "Hypertension (High BP)", value: hasHypertensionFamily, setter: setHasHypertensionFamily },
  ];

  return (
    <Screen>
      <Heading level={2}>Family Health History</Heading>
      <Body tone="muted">
        Heart conditions can run in families. Knowing this helps Kairos spot patterns earlier.
      </Body>

      <Card style={styles.card}>
        <Heading level={3}>First-degree relatives</Heading>
        <Body size="sm" tone="muted">
          Parents, siblings, or children.
        </Body>
        <View style={styles.list}>
          {familyItems.map((item) => (
            <View key={item.label} style={styles.row}>
              <Body style={styles.rowLabel}>{item.label}</Body>
              <Switch
                value={item.value}
                onValueChange={item.setter}
                trackColor={{ false: colors.border.default, true: colors.accent.roseLight }}
                thumbColor={item.value ? colors.accent.rose : "#f4f3f4"}
              />
            </View>
          ))}
        </View>
      </Card>

      <Button
        label={isSubmitting ? "Finishing..." : "Complete Survey"}
        onPress={handleDone}
        disabled={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    flex: 1,
    color: colors.fg.secondary,
  },
});
