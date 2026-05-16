/**
 * UserDataContext — caches the user's health data and exposes
 * mutation helpers. Anything that reads vitals / mood / KPIN should
 * go through this context so screens stay in sync.
 *
 * Hackathon-grade: simple state, manual refresh on focus. Production
 * would back this with react-query or Supabase realtime.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/services/supabase";
import { generateLiveVitals, generateMoodHistory } from "@/lib/mock-data";
import { summarizeKpin } from "@/lib/kpin";
import {
  BpReading,
  KpinEvaluation,
  KpinLevel,
  LiveVitals,
  MoodEntry,
  UserProfile,
  PregnancyHistory,
  FamilyHistory,
} from "@/types";

interface UserDataValue {
  profile: UserProfile | null;
  pregnancyHistory: PregnancyHistory | null;
  familyHistory: FamilyHistory | null;
  recentBp: BpReading[];
  recentMood: MoodEntry[];
  liveVitals: LiveVitals;
  kpinLevel: KpinLevel;
  isLoading: boolean;
  refresh: () => Promise<void>;
  pushKpinEvaluation: (evaluation: KpinEvaluation) => void;
}

const UserDataContext = createContext<UserDataValue | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pregnancyHistory, setPregnancyHistory] = useState<PregnancyHistory | null>(null);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistory | null>(null);
  const [recentBp, setRecentBp] = useState<BpReading[]>([]);
  const [recentMood, setRecentMood] = useState<MoodEntry[]>([]);
  const [liveVitals, setLiveVitals] = useState<LiveVitals>(generateLiveVitals());
  const [activeEvaluations, setActiveEvaluations] = useState<KpinEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPregnancyHistory(null);
      setFamilyHistory(null);
      setRecentBp([]);
      setRecentMood([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // TODO: replace placeholders with real Supabase queries once
      // the schema SQL has been applied. For now we fall back to
      // mock mood history and empty arrays so the dashboard renders.
      setRecentMood(generateMoodHistory(user.id));
      setRecentBp([]);
      setLiveVitals(generateLiveVitals());
      setProfile({
        id: user.id,
        email: user.email ?? null,
        fullName: user.user_metadata?.full_name ?? null,
        stage: "pregnant",
        dueDate: null,
        postpartumStartDate: null,
        createdAt: user.created_at,
        updatedAt: user.created_at,
      });
    } finally {
      setIsLoading(false);
    }
    // Silence unused import warning in early-stage code.
    void supabase;
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const kpinLevel = useMemo<KpinLevel>(
    () => summarizeKpin(activeEvaluations),
    [activeEvaluations],
  );

  const value = useMemo<UserDataValue>(
    () => ({
      profile,
      pregnancyHistory,
      familyHistory,
      recentBp,
      recentMood,
      liveVitals,
      kpinLevel,
      isLoading,
      refresh,
      pushKpinEvaluation: (evaluation: KpinEvaluation) => {
        setActiveEvaluations((prev) => [...prev.slice(-4), evaluation]);
      },
    }),
    [profile, pregnancyHistory, familyHistory, recentBp, recentMood, liveVitals, kpinLevel, isLoading, refresh],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside <UserDataProvider>");
  return ctx;
}
