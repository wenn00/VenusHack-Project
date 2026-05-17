import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { spacing } from "@/theme";

export default function SignupScreen() {
  const { signInAnonymous } = useAuth(); // Using anonymous for dev; replace with signUp later
  const [isBusy, setIsBusy] = useState(false);

  async function handleSignup() {
    setIsBusy(true);
    try {
      await signInAnonymous();
      // After signup, go to the first survey page instead of the dashboard
      // Use replace so they can't go back to the signup page after auth
      router.replace("/(auth)/intake-basic");
    } catch (err) {
      Alert.alert("Signup failed", (err as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Screen>
      <Heading level={1}>Create Account</Heading>
      <Card>
        <Body>Join Kairos to start your personalized health journey.</Body>
        <Button
          label={isBusy ? "Creating account..." : "Sign Up"}
          onPress={handleSignup}
          disabled={isBusy}
        />
        <Button
          label="Already have an account? Login"
          variant="ghost"
          onPress={() => router.push("/(auth)/login")}
        />
      </Card>
    </Screen>
  );
}