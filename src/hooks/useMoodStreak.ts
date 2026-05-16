/**
 * useMoodStreak — derives the user's current daily-mood streak
 * from the mood entries cached in UserDataContext.
 */

import { useMemo } from "react";
import { computeMoodStreak } from "@/lib/mock-data";
import { isToday } from "@/lib/format";
import { useUserData } from "@/contexts/UserDataContext";

export function useMoodStreak() {
  const { recentMood } = useUserData();

  return useMemo(() => {
    const todayEntry = recentMood.find((m) => isToday(m.loggedAt));
    return {
      todayEntry,
      hasLoggedToday: !!todayEntry,
      streak: computeMoodStreak(recentMood),
    };
  }, [recentMood]);
}
