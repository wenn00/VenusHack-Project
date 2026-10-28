import { useRef, useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { validIntakeDate } from "@/lib/intake";
import { supabase } from "@/services/supabase";
import { spacing, typography } from "@/theme";
import { PregnancyStage } from "@/types";

export default function IntakeBasicScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useUserData();
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [stageDraft, setStage] = useState<PregnancyStage | null>(null);
  const stage = stageDraft ?? profile?.stage ?? "not_specified";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateDraft, setDueDate] = useState<string | undefined>();
  const dueDate = dueDateDraft ?? profile?.dueDate ?? "";
  const [birthDateDraft, setBirthDate] = useState<string | undefined>();
  const birthDate = birthDateDraft ?? profile?.postpartumStartDate ?? "";
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const hasProfileName = Boolean(profile?.fullName);

  async function handleContinue() {
    if (!user || busy.current) return;
    setError(null);
    const nextFullName = (fullName.trim() || profile?.fullName || "").trim();

    if (!nextFullName) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }

    if (stage === "not_specified") {
      Alert.alert("Selection required", "Please select your current stage.");
      return;
    }

    const dateError = stage === "pregnant" ? validIntakeDate(dueDate, "due") : stage === "postpartum" ? validIntakeDate(birthDate, "birth") : null;
    if (dateError) { setError(dateError); return; }
    busy.current = true;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: nextFullName,
          stage: stage,
          due_date: stage === "pregnant" ? dueDate.trim() || null : null,
          postpartum_start_date: stage === "postpartum" ? birthDate.trim() || null : null,
          updated_at: new Date().toISOString(),
        }).select("id").single();

      if (error) throw error;

      await refresh();
      router.push("/(auth)/intake-pregnancy");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Could not save your profile. Your input is still here; please try again.");
    } finally {
      busy.current = false;
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
                disabled={isSubmitting}
                style={styles.stageButton}
              />
            ))}
          </View>
        </View>

        {stage === "pregnant" && <TextField label="Expected due date" accessibilityLabel="Expected due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" maxLength={10} editable={!isSubmitting} />}
        {stage === "postpartum" && <TextField label="When did you give birth?" accessibilityLabel="Birth date" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" maxLength={10} editable={!isSubmitting} />}
        {stage !== "planning" && stage !== "not_specified" && <Body size="sm" tone="muted">Leave the date blank if you are unsure. You can update it later.</Body>}
        {error && <Text accessibilityRole="alert" style={{ color: "#FFE8E8", lineHeight: 24 }}>{error}</Text>}
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
    fontFamily: typography.family.brand,
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
