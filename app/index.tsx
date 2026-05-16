/**
 * Entry redirect. The actual routing decision lives in RootGate.
 * This screen just keeps the user on a neutral splash while we decide.
 */

import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={session ? "/(app)/dashboard" : "/(auth)/login"} />;
}
