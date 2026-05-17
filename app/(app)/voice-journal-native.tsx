import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Body } from "@/components/ui/Body";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";

/**
 * Voice Journal — Real-time Speech-to-Text.
 *
 * Features:
 * - Real-time transcription using native/web speech API.
 * - Reddish aura effect when recording.
 * - Saves to `voice_journal_entries` in Supabase.
 */
export default function VoiceJournalScreen() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- Speech Recognition Setup ---
  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("end", () => setIsRecording(false));
  useSpeechRecognitionEvent("result", (event) => {
    // Some engines return segments, we join them to show the full text
    const text = event.results
      .map((r) => r.transcript)
      .join(" ")
      .trim();
    if (text) {
      setTranscript(text);
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error, event.message);
    setIsRecording(false);
    // Only alert on critical errors, ignore "no-speech" if they just clicked stop
    if (event.error !== "no-speech") {
      Alert.alert("Microphone Error", event.message);
    }
  });

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        setIsRecording(false);
        await ExpoSpeechRecognitionModule.stop();
      } else {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          Alert.alert("Permission required", "Please enable microphone access to use the voice journal.");
          return;
        }

        setTranscript("");
        setIsRecording(true);
        await ExpoSpeechRecognitionModule.start({
          lang: "en-US",
          interimResults: true,
          continuous: true,
        });
      }
    } catch (err) {
      console.error("Speech toggle error:", err);
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      Alert.alert("Nothing to save", "Speak something first!");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("voice_journal_entries").insert({
        user_id: user?.id,
        raw_transcript: transcript,
        recorded_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert("Journal Saved", "Your entry has been recorded.", [
        { text: "OK", onPress: () => router.replace("/(app)/dashboard") }
      ]);
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Could not save to database. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(app)/dashboard")} style={styles.homeButton}>
          <Ionicons name="home-outline" size={28} color={colors.fg.primary} />
        </TouchableOpacity>
        <Heading level={2}>Voice Journal</Heading>
        <View style={{ width: 28 }} /> {/* Spacer to center title */}
      </View>

      <View style={styles.content}>
        {/* Central Reddish Aura */}
        <View style={styles.auraContainer}>
          <View style={[styles.aura, isRecording && styles.auraActive]} />
        </View>

        <ScrollView
          style={styles.transcriptContainer}
          contentContainerStyle={styles.transcriptContent}
        >
          <Body size="lg" style={styles.transcriptText}>
            {transcript || (isRecording ? "Listening..." : "Tap the mic and start talking.")}
          </Body>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {transcript.trim().length > 0 && !isRecording && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Body style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Entry"}</Body>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleToggleRecording}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={40}
            color={colors.bg.card}
          />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  homeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  auraContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1,
  },
  aura: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.status.red,
    opacity: 0,
  },
  auraActive: {
    opacity: 0.1,
    shadowColor: colors.status.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 20, // Android shadow
  },
  transcriptContainer: {
    flex: 1,
  },
  transcriptContent: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  transcriptText: {
    textAlign: "center",
    lineHeight: 34,
    color: colors.fg.primary,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
  },
  micButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent.rose,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: colors.status.red,
    transform: [{ scale: 1.1 }],
  },
  saveButton: {
    backgroundColor: colors.bg.muted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  saveButtonText: {
    fontWeight: "600",
    color: colors.accent.rose,
  },
});
