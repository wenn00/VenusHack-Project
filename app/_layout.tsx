/**
 * Root layout — wraps the app in our providers and gates the route group
 * by authentication state.
 */

import { Slot, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Screen } from "@/components/ui/Screen";
import { Heading } from "@/components/ui/Heading";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { UserDataProvider, useUserData } from "@/contexts/UserDataContext";

function RootGate() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const {
    profile,
    pregnancyHistory,
    familyHistory,
    isLoading: isUserDataLoading,
    loadError,
    refresh,
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

    if (isAuthEntryPage || isUserDataLoading || loadError) return;

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

    if (!inAppGroup && !isIntakePage) {
      router.replace("/(app)/dashboard");
    }
  }, [
    session,
    isAuthLoading,
    isUserDataLoading,
    loadError,
    routeSegments,
    router,
    profile,
    pregnancyHistory,
    familyHistory,
  ]);

  return <>
    <Slot />
    {session && loadError && !["login", "signup"].includes(routeSegments[routeSegments.length - 1] ?? "") && (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 100, backgroundColor: "#1750AC" }]}>
        <Screen><Heading level={2}>Couldn’t load your profile</Heading><Body>{loadError}</Body><Button label="Try again" onPress={() => { void refresh(); }} /></Screen>
      </View>
    )}
  </>;
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
