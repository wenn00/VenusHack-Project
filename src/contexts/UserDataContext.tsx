/**
 * UserDataContext — caches the user's health data and exposes
 * mutation helpers. Anything that reads vitals / mood / KPIN should
 * go through this context so screens stay in sync.
 *
 * Reads come from Supabase using the user's session JWT, so RLS scopes
 * them automatically. Live vitals stay mocked because we don't have
 * HealthKit wired up in the managed Expo workflow.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/services/supabase";
import { generateLiveVitals } from "@/lib/mock-data";
import { summarizeKpin } from "@/lib/kpin";
import { evaluateBaselineRisk } from "@/lib/risk-analysis";
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
  baselineEvaluation: KpinEvaluation | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  pushKpinEvaluation: (evaluation: KpinEvaluation) => void;
}

const UserDataContext = createContext<UserDataValue | undefined>(undefined);

const RECENT_BP_LIMIT = 30;
const RECENT_MOOD_LIMIT = 60;

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
      // Fan out the queries in parallel; RLS scopes them to this user.
      const [profileRes, pregRes, familyRes, bpRes, moodRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("pregnancy_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("family_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("bp_readings")
          .select("*")
          .order("measured_at", { ascending: false })
          .limit(RECENT_BP_LIMIT),
        supabase
          .from("mood_entries")
          .select("*")
          .order("logged_at", { ascending: false })
          .limit(RECENT_MOOD_LIMIT),
      ]);

      setProfile(profileRes.data ? mapProfile(profileRes.data) : null);
      setPregnancyHistory(pregRes.data ? mapPregnancyHistory(pregRes.data) : null);
      setFamilyHistory(familyRes.data ? mapFamilyHistory(familyRes.data) : null);
      setRecentBp((bpRes.data ?? []).map(mapBpReading));
      setRecentMood((moodRes.data ?? []).map(mapMoodEntry));
      setLiveVitals(generateLiveVitals());
    } catch (err) {
      console.warn("[UserDataContext] refresh failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const baselineEvaluation = useMemo(() => {
    return evaluateBaselineRisk(profile, pregnancyHistory, familyHistory);
  }, [profile, pregnancyHistory, familyHistory]);

  const kpinLevel = useMemo<KpinLevel>(() => {
    return summarizeKpin([baselineEvaluation, ...activeEvaluations]);
  }, [baselineEvaluation, activeEvaluations]);

  const value = useMemo<UserDataValue>(
    () => ({
      profile,
      pregnancyHistory,
      familyHistory,
      recentBp,
      recentMood,
      liveVitals,
      kpinLevel,
      baselineEvaluation,
      isLoading,
      refresh,
      pushKpinEvaluation: (evaluation: KpinEvaluation) => {
        setActiveEvaluations((prev) => [...prev.slice(-4), evaluation]);
      },
    }),
    [profile, pregnancyHistory, familyHistory, recentBp, recentMood, liveVitals, kpinLevel, baselineEvaluation, isLoading, refresh],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside <UserDataProvider>");
  return ctx;
}

// ---- row mappers ------------------------------------------------------
// Supabase returns snake_case columns. The rest of the codebase uses
// camelCase, so we normalize at the boundary.

function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    stage: row.stage ?? "not_specified",
    dueDate: row.due_date,
    postpartumStartDate: row.postpartum_start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPregnancyHistory(row: any): PregnancyHistory {
  return {
    id: row.id,
    userId: row.user_id,
    hadPreeclampsia: row.had_preeclampsia,
    hadGestationalHypertension: row.had_gestational_hypertension,
    hadGestationalDiabetes: row.had_gestational_diabetes,
    hadPretermBirth: row.had_preterm_birth,
    hadEclampsia: row.had_eclampsia,
    numberOfPregnancies: row.number_of_pregnancies,
    notes: row.notes,
  };
}

function mapFamilyHistory(row: any): FamilyHistory {
  return {
    id: row.id,
    userId: row.user_id,
    hasCvdFamily: row.has_cvd_family,
    hasStrokeFamily: row.has_stroke_family,
    hasDiabetesFamily: row.has_diabetes_family,
    hasHypertensionFamily: row.has_hypertension_family,
    notes: row.notes,
  };
}

function mapBpReading(row: any): BpReading {
  return {
    id: row.id,
    userId: row.user_id,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    measuredAt: row.measured_at,
    source: row.source,
    notes: row.notes,
  };
}

function mapMoodEntry(row: any): MoodEntry {
  return {
    id: row.id,
    userId: row.user_id,
    mood: row.mood,
    note: row.note,
    loggedAt: row.logged_at,
  };
}
