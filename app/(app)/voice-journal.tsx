import { PageTitle } from "@/components/ui/PageTitle";
/**
 * Voice Journal.
 *
 * In-app dictation uses the configured speech module on supported native
 * builds and browsers. Typing and keyboard dictation remain available
 * when the module or permission is unavailable.
 *
 * On Save we forward the transcript to Gemini for structured summary
 * (symptoms, mood, key concerns, red flags, recommended next step) and
 * persist both the raw transcript and the JSON summary to Supabase.
 */

import { useRef, useState } from "react";
import { Alert, Keyboard, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { AiAccessError, summarizeVoiceJournal } from "@/services/gemini";
import { supabase } from "@/services/supabase";
import { colors, radius, spacing, typography } from "@/theme";
import { useDictation } from "@/hooks/useDictation";
import { VoiceJournalSummary } from "@/types";

export default function VoiceJournalScreen() {
  const { user } = useAuth();
  const { refresh } = useUserData();

  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<VoiceJournalSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const savingRef = useRef(false);
  const dictation = useDictation(setTranscript);

  async function handleSave() {
    if (savingRef.current || dictation.listening || dictation.pending) return;
    const trimmed = transcript.trim();
    if (!trimmed) {
      Alert.alert("Empty journal", "Type or dictate something first.");
      return;
    }
    if (!user) {
      Alert.alert("Not signed in", "Please sign in before saving.");
      return;
    }

    Keyboard.dismiss();
    savingRef.current = true;
    setIsSaving(true);

    // Try AI summarization first. If Gemini is unavailable we still save
    // the raw transcript so nothing is lost.
    let aiSummary: VoiceJournalSummary | null = null;
    let aiUnavailableMessage = "Couldn't generate an AI summary right now, but your entry is saved.";
    try {
      aiSummary = await summarizeVoiceJournal(trimmed);
    } catch (err) {
      console.warn("[voice-journal] Gemini summarize failed:", err);
      if (err instanceof AiAccessError) {
        aiUnavailableMessage = `Your entry is saved. ${err.message}`;
      }
    }

    try {
      const { error } = await supabase.from("voice_journal_entries").insert({
        user_id: user.id,
        raw_transcript: trimmed,
        ai_summary: aiSummary,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;

      await refresh();

      if (aiSummary) {
        setSummary(aiSummary);
      } else {
        Alert.alert("Saved", aiUnavailableMessage, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert("Could not save", (err as Error).message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  // ----- Summary screen ------------------------------------------------

  if (summary) {
    const hasRedFlag = summary.red_flag_symptoms.length > 0;
    return (
      <Screen>
        <PageTitle>Saved & analyzed</PageTitle>
        <Body tone="muted">Here's what Kairos picked out from what you said.</Body>

        <Card>
          <Heading level={3}>Mood</Heading>
          <Body size="lg" style={styles.moodValue}>
            {summary.mood}
          </Body>
        </Card>

        {summary.symptoms.length > 0 && (
          <Card>
            <Heading level={3}>Symptoms mentioned</Heading>
            {summary.symptoms.map((s, i) => (
              <Body key={`sym-${i}`}>• {s}</Body>
            ))}
          </Card>
        )}

        {summary.key_concerns.length > 0 && (
          <Card>
            <Heading level={3}>Key concerns</Heading>
            {summary.key_concerns.map((c, i) => (
              <Body key={`kc-${i}`}>• {c}</Body>
            ))}
          </Card>
        )}

        {hasRedFlag && (
          <Card style={{ backgroundColor: colors.status.redBg }}>
            <Heading level={3}>⚠️ Worth flagging</Heading>
            {summary.red_flag_symptoms.map((s, i) => (
              <Body key={`rf-${i}`}>• {s}</Body>
            ))}
            <Body tone="muted" size="sm">
              Consider contacting your provider about these.
            </Body>
          </Card>
        )}

        <Card>
          <Heading level={3}>Recommended next step</Heading>
          <Body>{summary.recommended_next_step}</Body>
        </Card>

        <Button label="Done" onPress={() => router.back()} />
        <Button
          label="New entry"
          variant="ghost"
          onPress={() => {
            setSummary(null);
            setTranscript("");
          }}
        />
      </Screen>
    );
  }

  // ----- Compose screen ------------------------------------------------

  return (
    <Screen>
      <PageTitle>Voice journal</PageTitle>
      <Body tone="muted">A moment to check in with yourself</Body>
      <Body tone="muted">
        Tell Kairos how you're feeling today — symptoms, mood, anything on your
        mind. We'll pull out the important parts.
      </Body>

      <Button
        label={dictation.pending ? "Starting microphone…" : dictation.listening ? "Stop dictation" : "Start dictation"}
        disabled={isSaving || dictation.pending}
        onPress={() => dictation.listening ? dictation.stop() : void dictation.start(transcript)}
      />
      {dictation.listening && <Body accessibilityLiveRegion="polite">Listening… speak naturally. Stop before reviewing and saving.</Body>}
      {!!dictation.error && <View accessibilityRole="alert"><Body>{dictation.error}</Body></View>}
      <Body size="sm" tone="muted">Speech recognition uses your device or browser's speech service and may send audio to its provider. Review the transcript before saving.</Body>
      <Card>
        <TextInput
          value={transcript}
          onChangeText={setTranscript}
          multiline
          autoFocus
          placeholder="I've had a headache since this morning and feel more tired than usual..."
          placeholderTextColor={colors.fg.muted}
          style={styles.input}
          editable={!isSaving && !dictation.listening && !dictation.pending}
          textAlignVertical="top"
        />
      </Card>

      <View style={styles.hintRow}>
        <Body tone="muted" size="sm" style={styles.hintText}>
          💡 Tap the microphone on your keyboard to dictate hands-free — your
          phone will transcribe automatically.
        </Body>
      </View>

      <Button
        label={isSaving ? "Saving & analyzing..." : "Save & analyze"}
        onPress={handleSave}
        disabled={isSaving || dictation.listening || dictation.pending || !transcript.trim()}
      />
      <Button
        label="Cancel"
        variant="ghost"
        onPress={() => router.back()}
        disabled={isSaving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 180,
    fontSize: typography.size.md,
    color: colors.fg.primary,
    padding: spacing.sm,
  },
  hintRow: {
    paddingHorizontal: spacing.sm,
  },
  hintText: {
    lineHeight: 20,
  },
  moodValue: {
    textTransform: "capitalize",
  },
});
