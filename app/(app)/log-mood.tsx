/**
 * Mood logging.
 *
 * Inserts a row into `mood_entries` and refreshes shared state so the
 * dashboard streak / mini chart update immediately.
 */

import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { Mood } from "@/types";
import { colors, radius, spacing, typography } from "@/theme";

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: "great", emoji: "😄", label: "Great" },
  { mood: "good", emoji: "😊", label: "Good" },
  { mood: "okay", emoji: "😐", label: "Okay" },
  { mood: "low", emoji: "😔", label: "Low" },
  { mood: "bad", emoji: "😢", label: "Bad" },
];

export default function LogMoodScreen() {
  const { user } = useAuth();
  const { refresh } = useUserData();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(moodOverride?: Mood) {
    const mood = moodOverride ?? selected;
    if (!mood) {
      Alert.alert("Pick a mood", "Tap an emoji that fits how you're feeling.");
      return;
    }
    if (!user) {
      Alert.alert("Not signed in", "Please sign in before logging your mood.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("mood_entries").insert({
        user_id: user.id,
        mood,
        note: note.trim() ? note.trim() : null,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;

      await refresh();
      router.back();
    } catch (err) {
      Alert.alert("Could not save", (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <Heading level={2}>How are you feeling?</Heading>
      <Body tone="muted">Tap whatever fits best — no wrong answer.</Body>

      <Card>
        <View style={styles.row}>
          {MOODS.map(({ mood, emoji, label }) => (
            <Pressable
              key={mood}
              onPress={() => setSelected(mood)}
              style={({ pressed }) => [
                styles.bubble,
                selected === mood && styles.bubbleActive,
                pressed && styles.bubblePressed,
              ]}
              disabled={isSaving}
            >
              <Body size="lg" style={styles.emoji}>
                {emoji}
              </Body>
              <Body tone="muted" size="sm">
                {label}
              </Body>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Body tone="muted" size="sm">
          Add a note (optional)
        </Body>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          placeholder="What's behind this feeling today?"
          placeholderTextColor={colors.fg.muted}
          style={styles.noteInput}
          editable={!isSaving}
        />
      </Card>

      <Button
        label={isSaving ? "Saving..." : "Save"}
        onPress={() => handleSave()}
        disabled={isSaving || !selected}
      />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bubble: {
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    minWidth: 56,
  },
  bubbleActive: {
    backgroundColor: colors.accent.roseLight,
  },
  bubblePressed: {
    backgroundColor: colors.bg.muted,
  },
  emoji: {
    fontSize: 36,
  },
  noteInput: {
    minHeight: 64,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.muted,
    color: colors.fg.primary,
    fontSize: typography.size.md,
    textAlignVertical: "top",
  },
});
