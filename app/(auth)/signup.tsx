import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
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
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{step === "form" ? "Onboarding" : "Verify Email"}</Text>
        <Body tone="muted" size="lg">
          {step === "form" ? "First, what’s your name?" : `Enter the code sent to ${email}`}
        </Body>
      </View>

      {step === "form" ? (
        <View style={styles.form}>
          <TextField
            label="Full name"
            required
            placeholder="Enter your name"
            value={fullName}
            onChangeText={setFullName}
            editable={!isBusy}
          />

          <TextField
            label="Email"
            required
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isBusy}
          />

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
            label={isBusy ? "Sending Code..." : "Sign Up"}
            onPress={handleSendOtp}
            disabled={isBusy}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="Verification code"
            required
            placeholder="Enter code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isBusy}
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
