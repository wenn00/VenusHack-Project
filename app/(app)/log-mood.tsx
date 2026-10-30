import { useCallback, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
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
  const scrollRef = useRef<ScrollView>(null);

  const notesInputRef = useRef<TextInput>(null);
  const revealFrame = useRef<number | null>(null);
  const insets = useSafeAreaInsets();
  const revealNotes = useCallback(() => {
    if (Platform.OS === "web" || !Keyboard.isVisible()) return;
    if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const input = notesInputRef.current;
      if (input?.isFocused()) {
        // The responder measures within the scroll content, so include its safe-area origin.
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(input, insets.top + 16, true);
      }
    });
  }, [insets.top]);

  useFocusEffect(useCallback(() => {
    const keyboard = Keyboard.addListener("keyboardDidShow", revealNotes);
    return () => {
      keyboard.remove();
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
      revealFrame.current = null;
    };
  }, [revealNotes]));
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
      <Screen scrollRef={scrollRef} contentStyle={{ paddingHorizontal: 24, paddingTop: 0, gap: 0 }} showMenu={menuVisible}>
        <MoodTracker notesInputRef={notesInputRef} onNotesFocus={revealNotes} firstName={profile?.fullName?.trim().split(/\s+/)[0]} isSaving={isSaving} error={error} onSave={saveMood}
          onMenuVisibleChange={setMenuVisible} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
