import React, { useState, useEffect, useCallback } from "react";
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
 * Voice Journal Screen
 * Uses expo-speech-recognition for real-time transcription.
 * Saves results to Supabase `voice_journal_entries`.
 */
export default function VoiceJournalScreen() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Handle Speech Recognition Events
  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("stop", () => setIsRecording(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript ?? "");
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error, event.message);
    setIsRecording(false);
    Alert.alert("Error", "Speech recognition failed: " + event.message);
  });

  const startRecording = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert("Permission denied", "We need microphone access to record your journal.");
      return;
    }

    setTranscript(""); // Clear previous transcript
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
    });
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCancel = () => {
    if (isRecording) stopRecording();
    setTranscript("");
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      Alert.alert("Empty Journal", "Please record some thoughts before saving.");
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

      Alert.alert("Success", "Journal saved!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save journal entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Heading level={2}>Voice Journal</Heading>
        {transcript.length > 0 && !isRecording && (
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Body style={{ color: colors.accent.rose, fontWeight: "600" }}>
              {isSaving ? "Saving..." : "Save"}
            </Body>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* The Aura Effect */}
        <View style={styles.auraContainer}>
          <View style={[styles.aura, isRecording && styles.auraActive]} />
        </View>

        <ScrollView
          style={styles.transcriptContainer}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
        >
          <Body size="lg" style={styles.transcriptText}>
            {transcript || (isRecording ? "Listening..." : "Tap the mic to start speaking...")}
          </Body>
        </ScrollView>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => router.back()}
          accessibilityLabel="Return home"
        >
          <Ionicons name="arrow-undo-outline" size={28} color={colors.fg.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleToggleRecording}
          accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={36}
            color={colors.bg.card}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={handleCancel}
          accessibilityLabel="Cancel transcription"
        >
          <Ionicons name="close-outline" size={32} color={colors.fg.secondary} />
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
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  auraContainer: {
    position: "absolute",
    zIndex: -1,
    justifyContent: "center",
    alignItems: "center",
  },
  aura: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.status.red,
    opacity: 0,
    // iOS shadow for the aura glow
    shadowColor: colors.status.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    // Android elevation (limited for glows, but helps)
    elevation: 0,
  },
  auraActive: {
    opacity: 0.15,
    elevation: 20,
    transform: [{ scale: 1.2 }],
  },
  transcriptContainer: {
    flex: 1,
    width: "100%",
  },
  transcriptContent: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  transcriptText: {
    textAlign: "center",
    lineHeight: 32,
    color: colors.fg.primary,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.rose,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: colors.status.red,
  },
  sideButton: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});
