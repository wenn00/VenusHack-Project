import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { colors, radius, spacing } from "@/theme";

export default function LoginScreen() {
  const { signInWithOtp, verifyOtp, signInAnonymous } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");

  async function handleSendOtp() {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    setIsBusy(true);
    try {
      // We can't pre-check the profiles table here: the user is signed
      // out, so RLS hides every row and the lookup always comes back
      // empty. Let Supabase auth decide instead — shouldCreateUser:false
      // rejects emails that have never signed up.
      await signInWithOtp(email.toLowerCase(), false);
      setStep("otp");
      Alert.alert("Code Sent", "Please check your email for the verification code.");
    } catch (err) {
      console.error("[login] error:", err);
      const message = (err as Error).message ?? "";
      if (/signup|not allowed|otp_disabled|not found/i.test(message)) {
        Alert.alert(
          "User Not Found",
          "No account found with this email. Please sign up first.",
          [{ text: "Go to Sign Up", onPress: () => router.push("/(auth)/signup") }]
        );
      } else {
        Alert.alert("Login Failed", message);
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }

    setIsBusy(true);
    try {
      await verifyOtp(email.toLowerCase(), otp);
      // RootGate does not auto-redirect away from the login screen, so
      // navigate explicitly once verifyOtp has set the session.
      router.replace("/(app)/dashboard");
    } catch (err) {
      console.error("[verify] error:", err);
      Alert.alert("Verification Failed", "Invalid or expired code.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDevSkip() {
    setIsBusy(true);
    try {
      await signInAnonymous();
      router.replace("/(app)/dashboard");
    } catch (err) {
      console.error("[login] dev skip error:", err);
      Alert.alert("Anonymous sign-in failed", (err as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Heading level={1}>Kairos</Heading>
        <Body tone="muted" size="lg">
          Heart health, made personal — for every step of your pregnancy.
        </Body>
      </View>

      <Card>
        <Heading level={3}>{step === "email" ? "Login" : "Verify Code"}</Heading>
        <Body tone="muted">
          {step === "email"
            ? "Enter your email to receive a secure login code."
            : `Enter the code sent to ${email}`}
        </Body>

        {step === "email" ? (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.fg.muted}
            />
            <Button
              label={isBusy ? "Sending..." : "Login"}
              onPress={handleSendOtp}
              disabled={isBusy}
            />
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="4-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6} // Some Otps are 6 digits by default in Supabase
              placeholderTextColor={colors.fg.muted}
            />
            <Button
              label={isBusy ? "Verifying..." : "Verify & Continue"}
              onPress={handleVerifyOtp}
              disabled={isBusy}
            />
            <Button
              label="Back to Email"
              variant="ghost"
              onPress={() => setStep("email")}
              disabled={isBusy}
            />
          </View>
        )}
      </Card>

      <Button
        label="Don't have an account? Sign Up"
        variant="ghost"
        onPress={() => router.push("/(auth)/signup")}
        disabled={isBusy}
      />
      <Button
        label="Skip for now (dev)"
        variant="ghost"
        onPress={handleDevSkip}
        disabled={isBusy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  inputGroup: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
});
