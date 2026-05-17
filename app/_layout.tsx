/**
 * Root layout — wraps the app in our providers and gates the route group
 * by authentication state.
 */

import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserDataProvider } from "@/contexts/UserDataContext";

function RootGate() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Allow authenticated users to finish the intake survey
      // segments[0] is usually "(auth)", segments[1] is the screen name
      const screenName = segments[segments.length - 1];
      const isIntakePage = screenName?.startsWith("intake-");

      if (!isIntakePage && screenName !== "signup" && screenName !== "login") {
        router.replace("/(app)/dashboard");
      }
    }
  }, [session, isLoading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <UserDataProvider>
            <StatusBar style="dark" />
            <RootGate />
          </UserDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
