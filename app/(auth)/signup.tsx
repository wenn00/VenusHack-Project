import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { colors, radius, spacing } from "@/theme";
import { PregnancyStage } from "@/types";

export default function SignupScreen() {
  const { signInWithOtp, verifyOtp } = useAuth();
  const { refresh } = useUserData();
  const [isBusy, setIsBusy] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [stage, setStage] = useState<PregnancyStage>("not_specified");

  // Flow State
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");

  const stages: { label: string; value: PregnancyStage }[] = [
    { label: "I am pregnant", value: "pregnant" },
    { label: "I am postpartum", value: "postpartum" },
    { label: "I am planning a pregnancy", value: "planning" },
  ];

  async function handleSendOtp() {
    if (!email.trim() || !fullName.trim() || stage === "not_specified") {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsBusy(true);
    try {
      console.log("[signup] checking if user exists:", email);
      // Check if user already exists
      const { data, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error("[signup] check error:", checkError);
        throw checkError;
      }

      if (data) {
        Alert.alert(
          "Account Exists",
          "An account with this email already exists. Please log in instead.",
          [{ text: "Go to Login", onPress: () => router.push("/(auth)/login") }]
        );
        return;
      }

      console.log("[signup] calling signInWithOtp for:", email);
      await signInWithOtp(email.toLowerCase());
      console.log("[signup] otp sent successfully");
      setStep("otp");
      Alert.alert("Code Sent", "Please check your email for the verification code.");
    } catch (err) {
      console.error("[signup] error:", err);
      Alert.alert("Signup Failed", (err as Error).message || "Unknown error occurred");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerifyAndCreate() {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }

    setIsBusy(true);
    try {
      // 1. Verify OTP (this signs the user in)
      await verifyOtp(email.toLowerCase(), otp);

      // 2. Get the new user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not retrieve user after verification.");

      // 3. Create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: email.toLowerCase(),
          full_name: fullName,
          stage: stage,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      await refresh();

      // 4. Redirect to next intake step
      router.replace("/(auth)/intake-pregnancy");
    } catch (err) {
      console.error("[signup] verify error:", err);
      Alert.alert("Verification Failed", "Invalid code or error creating profile.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Screen>
      <Heading level={1}>Create Account</Heading>

      {step === "form" ? (
        <Card style={styles.card}>
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
            <Body size="sm" style={styles.label}>Email Address</Body>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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
                  variant={stage === s.value ? "primary" : "secondary"}
                  onPress={() => setStage(s.value)}
                  style={styles.stageButton}
                />
              ))}
            </View>
          </View>

          <Button
            label={isBusy ? "Sending Code..." : "Sign Up"}
            onPress={handleSendOtp}
            disabled={isBusy}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Heading level={3}>Verify Email</Heading>
          <Body tone="muted">Enter the code sent to {email}</Body>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Verification code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={colors.fg.muted}
            />
            <Button
              label={isBusy ? "Verifying..." : "Verify & Create Account"}
              onPress={handleVerifyAndCreate}
              disabled={isBusy}
            />
            <Button
              label="Back to Edit Info"
              variant="ghost"
              onPress={() => setStep("form")}
              disabled={isBusy}
            />
          </View>
        </Card>
      )}

      <Button
        label="Already have an account? Login"
        variant="ghost"
        onPress={() => router.push("/(auth)/login")}
        disabled={isBusy}
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
