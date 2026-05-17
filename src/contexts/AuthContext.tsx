/**
 * AuthContext — owns the Supabase session and current user.
 *
 * Screens never call supabase.auth directly; they go through useAuth().
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /**
   * Quick "guest" sign-in for the dev / demo flow. Hits Supabase's anonymous
   * sign-in endpoint which still returns a real JWT, so RLS works and inserts
   * are scoped to a unique user_id.
   *
   * Requires Anonymous Sign-ins to be enabled in the Supabase dashboard:
   *   Authentication -> Sign In / Providers -> Anonymous Sign-Ins -> Enable.
   */
  signInAnonymous: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      console.log("[auth] initial session:", data.session ? data.session.user.id : "(none)");
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[auth] state change:", event, newSession ? newSession.user.id : "(none)");
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signInAnonymous: async () => {
        console.log("[auth] calling supabase.auth.signInAnonymously()...");
        const { data, error } = await supabase.auth.signInAnonymously();
        console.log("[auth] result:", { data, error });
        if (error) throw error;
      },
      signInWithOtp: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      },
      verifyOtp: async (email: string, token: string) => {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
