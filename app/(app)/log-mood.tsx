import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { supabase } from "@/services/supabase";
import { Mood } from "@/types";
import { colors, radius, typography } from "@/theme";

const clusterWidth = 270;
const circleSize = 56;
const clusterCenter = clusterWidth / 2;
const circleLeft = (centerX: number) => centerX - circleSize / 2;

const moodOptions: { mood: Mood; color: string; shadow: string; style: ViewStyle }[] = [
  {
    mood: "great",
    color: "#FCDC84",
    shadow: "#D9A83C",
    style: { top: 0, left: circleLeft(clusterCenter) },
  },
  {
    mood: "good",
    color: "#98D3F3",
    shadow: "#64A9D2",
    style: { top: 62, left: circleLeft(clusterCenter - 76) },
  },
  {
    mood: "okay",
    color: "#8D9AF7",
    shadow: "#6672D8",
    style: { top: 62, left: circleLeft(clusterCenter + 76) },
  },
  {
    mood: "low",
    color: "#FFC782",
    shadow: "#E69A4D",
    style: { top: 139, left: circleLeft(clusterCenter - 42) },
  },
  {
    mood: "bad",
    color: "#FFA09B",
    shadow: "#E37070",
    style: { top: 139, left: circleLeft(clusterCenter + 42) },
  },
];

export default function LogMoodScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useUserData();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const firstName = profile?.fullName?.split(" ")[0] || "Sahana";
  const selectedOption = moodOptions.find((option) => option.mood === selected);

  async function handleReturnHome() {
    if (!selected) {
      router.replace("/(app)/dashboard");
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
        mood: selected,
        note: note.trim() ? note.trim() : null,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;

      await refresh();
      router.replace("/(app)/dashboard");
    } catch (err) {
      Alert.alert("Could not save", (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <Text style={styles.brand}>Kairos</Text>

      {selected ? (
        <View style={styles.selectedContent}>
          <Text style={styles.title}>Glad to see it,{"\n"}{firstName}</Text>
          <View
            style={[
              styles.selectedMood,
              {
                backgroundColor: selectedOption?.color,
                shadowColor: selectedOption?.shadow,
              },
            ]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Leave some notes"
            placeholderTextColor="rgba(255, 255, 255, 0.44)"
            style={styles.noteInput}
            editable={!isSaving}
          />
          <Pressable
            onPress={handleReturnHome}
            disabled={isSaving}
            style={({ pressed }) => [styles.returnButton, pressed && styles.pressed, isSaving && styles.disabled]}
          >
            <Text style={styles.returnLabel}>{isSaving ? "Saving..." : "Return to Home"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.selectContent}>
          <Text style={styles.title}>How do you feel{"\n"}today?</Text>
          <View style={styles.moodCluster}>
            {moodOptions.map((option) => (
              <MoodCircle
                key={option.mood}
                color={option.color}
                shadowColor={option.shadow}
                style={option.style}
                onPress={() => setSelected(option.mood)}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

function MoodCircle({
  color,
  shadowColor,
  style,
  onPress,
}: {
  color: string;
  shadowColor: string;
  style: ViewStyle;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.moodCircle,
        style,
        { backgroundColor: color, shadowColor },
        pressed && styles.pressed,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    minHeight: 812,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 96,
  },
  brand: {
    alignSelf: "center",
    color: colors.fg.primary,
    fontFamily: typography.family.brand,
    fontSize: 20,
    lineHeight: 28,
  },
  selectContent: {
    marginTop: 46,
    flex: 1,
  },
  selectedContent: {
    marginTop: 46,
    flex: 1,
    alignItems: "center",
  },
  title: {
    alignSelf: "flex-start",
    color: colors.fg.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "400",
  },
  moodCluster: {
    position: "relative",
    alignSelf: "center",
    width: clusterWidth,
    height: 235,
    marginTop: 50,
  },
  moodCircle: {
    position: "absolute",
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
    shadowOpacity: 0.52,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  selectedMood: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginTop: 40,
    marginBottom: 28,
    shadowOpacity: 0.52,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  noteInput: {
    width: "100%",
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.fg.primary,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  returnButton: {
    width: "100%",
    minHeight: 40,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0, 51, 150, 0.22)",
  },
  returnLabel: {
    color: colors.fg.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.56,
  },
});
