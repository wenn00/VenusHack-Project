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

export default function IntakePregnancyScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useUserData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pregnancy History State
  const [hadPreeclampsia, setHadPreeclampsia] = useState(false);
  const [hadGestationalHypertension, setHadGestationalHypertension] = useState(false);
  const [hadGestationalDiabetes, setHadGestationalDiabetes] = useState(false);
  const [hadPretermBirth, setHadPretermBirth] = useState(false);
  const [hadEclampsia, setHadEclampsia] = useState(false);

  async function handleContinue() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("pregnancy_history").insert({
        user_id: user.id,
        had_preeclampsia: hadPreeclampsia,
        had_gestational_hypertension: hadGestationalHypertension,
        had_gestational_diabetes: hadGestationalDiabetes,
        had_preterm_birth: hadPretermBirth,
        had_eclampsia: hadEclampsia,
        number_of_pregnancies: 1,
      });

      if (error) throw error;

      await refresh();
      router.push("/(auth)/intake-family");
    } catch (err) {
      console.error("Error saving pregnancy history:", err);
      Alert.alert("Error", "Could not save pregnancy history.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const historyItems = [
    { label: "Preeclampsia", value: hadPreeclampsia, setter: setHadPreeclampsia },
    { label: "Gestational Hypertension", value: hadGestationalHypertension, setter: setHadGestationalHypertension },
    { label: "Gestational Diabetes", value: hadGestationalDiabetes, setter: setHadGestationalDiabetes },
    { label: "Preterm Birth", value: hadPretermBirth, setter: setHadPretermBirth },
    { label: "Eclampsia", value: hadEclampsia, setter: setHadEclampsia },
  ];

  return (
    <Screen>
      <Heading level={2}>Your Journey</Heading>
      <Body tone="muted">
        {profile?.stage === "pregnant"
          ? "Tell us about your current or past pregnancies."
          : "Tell us about your pregnancy history."}
      </Body>

      <Card style={styles.card}>
        <Heading level={3}>Have you ever experienced any of these?</Heading>
        <View style={styles.list}>
          {historyItems.map((item) => (
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

      <View style={styles.footer}>
        <Button
          label={isSubmitting ? "Saving..." : "Continue"}
          onPress={handleContinue}
          disabled={isSubmitting}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          onPress={() => router.push("/(auth)/intake-family")}
          disabled={isSubmitting}
        />
      </View>
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
  footer: {
    gap: spacing.sm,
  },
});
