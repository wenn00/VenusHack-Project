/**
 * Mood logging — placeholder. Five emoji buttons + optional note.
 */

import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { Mood } from "@/types";
import { colors, radius, spacing } from "@/theme";

const MOODS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: "great", emoji: "😄", label: "Great" },
  { mood: "good", emoji: "😊", label: "Good" },
  { mood: "okay", emoji: "😐", label: "Okay" },
  { mood: "low", emoji: "😔", label: "Low" },
  { mood: "bad", emoji: "😢", label: "Bad" },
];

export default function LogMoodScreen() {
  function handleSelect(mood: Mood) {
    // TODO: persist to Supabase mood_entries table.
    void mood;
    router.back();
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
              onPress={() => handleSelect(mood)}
              style={({ pressed }) => [styles.bubble, pressed && styles.bubblePressed]}
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
  bubblePressed: {
    backgroundColor: colors.bg.muted,
  },
  emoji: {
    fontSize: 36,
  },
});
