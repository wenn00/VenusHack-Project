/**
 * Root layout — wraps the app in our providers and gates the route group
 * by authentication state.
 */

import { Slot, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserDataProvider, useUserData } from "@/contexts/UserDataContext";

function RootGate() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const {
    profile,
    pregnancyHistory,
    familyHistory,
    isLoading: isUserDataLoading,
  } = useUserData();
  const segments = useSegments();
  const routeSegments = segments as readonly string[];
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;

    const firstSegment = routeSegments[0];
    const screenName = routeSegments[routeSegments.length - 1];
    const inAuthGroup = firstSegment === "(auth)";
    const inAppGroup = firstSegment === "(app)";
    const isAuthEntryPage = screenName === "login" || screenName === "signup";
    const isIntakePage = screenName?.startsWith("intake-");
    const isSplashPage = routeSegments.length === 0 || screenName === "index";

    if (isSplashPage) return;

    if (!session) {
      if (!inAuthGroup || isIntakePage) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (isAuthEntryPage || isUserDataLoading) return;

    if (!profile || !profile.fullName || profile.stage === "not_specified") {
      if (screenName !== "intake-basic") {
        router.replace("/(auth)/intake-basic");
      }
      return;
    }

    if (!pregnancyHistory) {
      if (screenName !== "intake-pregnancy") {
        router.replace("/(auth)/intake-pregnancy");
      }
      return;
    }

    if (!familyHistory) {
      if (screenName !== "intake-family") {
        router.replace("/(auth)/intake-family");
      }
      return;
    }

    if (!inAppGroup) {
      router.replace("/(app)/dashboard");
    }
  }, [
    session,
    isAuthLoading,
    isUserDataLoading,
    routeSegments,
    router,
    profile,
    pregnancyHistory,
    familyHistory,
  ]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PracticesCollectionDemo: require("../assets/fonts/PracticesCollectionDemo.otf"),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <UserDataProvider>
            <StatusBar style="light" />
            <RootGate />
          </UserDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
