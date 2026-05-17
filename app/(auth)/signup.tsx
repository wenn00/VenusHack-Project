import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { spacing, typography } from "@/theme";

export default function SignupScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const prefilledEmail = getParamString(params.email);
  const { signInWithOtp, verifyOtp, signOut } = useAuth();
  const { refresh } = useUserData();
  const [isBusy, setIsBusy] = useState(false);

  // Form State
  const [email, setEmail] = useState(prefilledEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Flow State
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const emailLocked = Boolean(prefilledEmail);

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  async function handleSendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!normalizedEmail || !firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsBusy(true);
    try {
      console.log("[signup] calling signInWithOtp for:", normalizedEmail);
      await signOut();
      await signInWithOtp(normalizedEmail, true, {
        full_name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth.trim(),
      });
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
      const normalizedEmail = email.trim().toLowerCase();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // 1. Verify OTP (this signs the user in)
      await verifyOtp(normalizedEmail, otp);

      // 2. Get the new user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not retrieve user after verification.");

      // 3. Create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: normalizedEmail,
          full_name: fullName,
          stage: "not_specified",
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      await refresh();

      // 4. Redirect to the next first-time onboarding step.
      router.replace("/(auth)/intake-basic");
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
          {!emailLocked && (
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
          )}

          <TextField
            label="First"
            required
            placeholder="Enter first name"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isBusy}
          />

          <TextField
            label="Last"
            required
            placeholder="Enter last name"
            value={lastName}
            onChangeText={setLastName}
            editable={!isBusy}
          />

          <TextField
            label="What’s your date of birth?"
            required
            placeholder="MM/DD/YYYY"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numbers-and-punctuation"
            editable={!isBusy}
          />

          <Button
            label={isBusy ? "Sending Code..." : "Continue"}
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
});

function getParamString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
