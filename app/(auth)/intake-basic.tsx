import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { spacing, typography } from "@/theme";
import { PregnancyStage } from "@/types";

export default function IntakeBasicScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useUserData();
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [stage, setStage] = useState<PregnancyStage>("not_specified");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasProfileName = Boolean(profile?.fullName);

  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile?.fullName]);

  async function handleContinue() {
    if (!user) return;
    const nextFullName = (fullName.trim() || profile?.fullName || "").trim();

    if (!nextFullName) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }

    if (stage === "not_specified") {
      Alert.alert("Selection required", "Please select your current stage.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: nextFullName,
          stage: stage,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await refresh();
      router.push("/(auth)/intake-pregnancy");
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert("Error", "Could not save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const stages: { label: string; value: PregnancyStage }[] = [
    { label: "I am pregnant", value: "pregnant" },
    { label: "I am postpartum", value: "postpartum" },
    { label: "I am planning a pregnancy", value: "planning" },
  ];

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Onboarding</Text>
        <Body tone="muted" size="lg">
          Pregnancy is like being on the treadmill for 9 months, so where are you right now?
        </Body>
      </View>

      <View style={styles.form}>
        {!hasProfileName && (
          <TextField
            label="Full name"
            required
            placeholder="Enter your name"
            value={fullName}
            onChangeText={setFullName}
            editable={!isSubmitting}
          />
        )}

        <View style={styles.stageGroup}>
          <Body style={styles.label}>Where are you right now?</Body>
          <View style={styles.buttonGroup}>
            {stages.map((s) => (
              <Button
                key={s.value}
                label={s.label}
                variant={stage === s.value ? "primary" : "secondary"}
                onPress={() => setStage(s.value)}
                style={styles.stageButton}
              />
            ))}
          </View>
        </View>

        <Button
          label={isSubmitting ? "Saving..." : "Continue"}
          onPress={handleContinue}
          disabled={isSubmitting || stage === "not_specified"}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 40,
    paddingTop: 70,
    gap: 32,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: "white",
    fontSize: 36,
    lineHeight: 44,
    fontFamily: typography.family.display,
  },
  form: {
    gap: 37,
  },
  label: {
    color: "white",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  stageGroup: {
    gap: spacing.sm,
  },
  buttonGroup: {
    gap: 11,
  },
  stageButton: {
    minHeight: 55,
  },
});
