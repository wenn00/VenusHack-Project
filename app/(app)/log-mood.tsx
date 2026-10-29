import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { MoodTracker } from "@/components/mood/MoodTracker";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { Mood } from "@/types";

export default function LogMoodScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useUserData();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(true);
  // Synchronous guard covers rapid taps before React has disabled the button.
  const savingRef = useRef(false);
  const savedRef = useRef(false);

  async function saveMood(mood: Mood, note: string) {
    if (savingRef.current || savedRef.current) return;
    if (!user) {
      setError("Please sign in before saving your mood.");
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase.from("mood_entries").insert({
        user_id: user.id,
        mood,
        note: note.trim() || null,
        logged_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      savedRef.current = true;
      // A refresh failure must not invite a second insert of an already saved entry.
      try { await refresh(); } catch (refreshError) { console.warn("[mood] refresh failed", refreshError); }
      router.replace("/(app)/dashboard");
    } catch (saveError) {
      console.warn("[mood] save failed", saveError);
      setError("Your mood couldn't be saved. Your note is still here — please try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={{ paddingHorizontal: 32, gap: 0 }} showMenu={menuVisible}>
        <MoodTracker firstName={profile?.fullName?.trim().split(/\s+/)[0]} isSaving={isSaving} error={error} onSave={saveMood}
          onMenuVisibleChange={setMenuVisible} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
