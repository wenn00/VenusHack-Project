import { useState } from "react";
import { StyleSheet, TextInput, View, Alert } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { spacing, colors, radius } from "@/theme";
import { PregnancyStage } from "@/types";

export default function IntakeBasicScreen() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const [fullName, setFullName] = useState("");
  const [stage, setStage] = useState<PregnancyStage>("not_specified");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!user) return;
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
          full_name: fullName,
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
    <Screen>
      <Heading level={2}>Welcome to Kairos</Heading>
      <Body tone="muted">
        Let's get to know you better so we can provide the best support.
      </Body>

      <Card style={styles.card}>
        <Heading level={3}>Basic Information</Heading>

        <View style={styles.inputGroup}>
          <Body size="sm" style={styles.label}>Full Name</Body>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor={colors.fg.muted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Body size="sm" style={styles.label}>Where are you in your journey?</Body>
          <View style={styles.buttonGroup}>
            {stages.map((s) => (
              <Button
                key={s.value}
                label={s.label}
                variant={stage === s.value ? "primary" : "outline"}
                onPress={() => setStage(s.value)}
                style={styles.stageButton}
              />
            ))}
          </View>
        </View>
      </Card>

      <Button
        label={isSubmitting ? "Saving..." : "Continue"}
        onPress={handleContinue}
        disabled={isSubmitting || stage === "not_specified"}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontWeight: "600",
    color: colors.fg.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.fg.primary,
    backgroundColor: colors.bg.page,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  stageButton: {
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
  },
});
