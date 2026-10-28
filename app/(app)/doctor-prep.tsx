/**
 * Doctor Visit Prep.
 *
 * Aggregates the user's last 30 days across every signal we collect —
 * BP, rPPG vitals, mood, voice journal transcripts, symptom reports,
 * chat-message excerpts — plus baseline history (pregnancy, family),
 * then asks the AI to produce a clinician-style summary delivered as
 * scannable bullet points.
 *
 * The PDF export combines the AI bullets with a real BP-readings table
 * pulled from the database so the clinician can verify the underlying
 * data at a glance.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { AiAccessError, DoctorSummary, generateDoctorSummary } from "@/services/gemini";
import { BpRow, exportDoctorSummary, MoodRow } from "@/services/pdf";
import { supabase } from "@/services/supabase";
import { colors, spacing } from "@/theme";

import { readSavedSummary } from "@/lib/saved-summary";
import { validAppointmentId } from "@/lib/appointments";

type Stage = "idle" | "loading" | "ready" | "error";
class SummaryPreparationError extends Error {}

const DAYS_BACK = 30;
const MAX_CHAT_EXCERPTS = 25;
const MAX_VOICE_ENTRIES = 10;

interface GatheredData {
  payload: object;
  bpRows: BpRow[];
  moodRows: MoodRow[];
}

export default function DoctorPrepScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string | string[] }>();
  const [loadRevision, setLoadRevision] = useState(0);
  const [errorAction, setErrorAction] = useState<"load" | "generate" | "none">("generate");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const generating = useRef(false);
  const contextVersion = useRef(0);
  const [generatedAt, setGeneratedAt] = useState("");
  const { profile } = useUserData();

  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [rawBp, setRawBp] = useState<BpRow[]>([]);
  const [rawMood, setRawMood] = useState<MoodRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const version = ++contextVersion.current;
    generating.current = false;
    let active = true;
    // A changed appointment/account must clear the previous patient snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(null); setRawBp([]); setRawMood([]); setGeneratedAt(""); setErrorMessage(null); setStage("idle");
    setErrorAction("generate"); setLoadingSaved(false);
    const cleanup = () => { active = false; if (contextVersion.current === version) contextVersion.current++; };
    if (!appointmentId || !userId) return cleanup;
    if (!validAppointmentId(appointmentId)) { setErrorMessage("Invalid appointment link. Return to your appointments and choose a visit."); setErrorAction("none"); setStage("error"); return cleanup; }
    setStage("loading"); setLoadingSaved(true);
    supabase.from("appointments").select("summary").eq("id", appointmentId).eq("user_id", userId).single().then(({ data, error }) => {
      if (!active) return;
      if (error) { setErrorMessage("Could not load this appointment."); setErrorAction("load"); setStage("error"); return; }
      if (data.summary) {
        try {
          const saved = readSavedSummary(data.summary);
          setSummary(saved.summary); setRawBp(saved.bpRows); setRawMood(saved.moodRows); setGeneratedAt(saved.generatedAt); setStage("ready");
        } catch { setErrorMessage("Saved summary could not be read. Generate a new summary to replace it."); setStage("error"); }
      } else setStage("idle");
    }, () => { if (active) { setErrorMessage("Could not load this appointment."); setErrorAction("load"); setStage("error"); } });
    return cleanup;
  }, [appointmentId, userId, loadRevision]);

  const handleGenerate = useCallback(async () => {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first.");
      return;
    }
    if (generating.current) return;
    if (appointmentId && !validAppointmentId(appointmentId)) return;
    const version = contextVersion.current;
    const current = () => version === contextVersion.current;
    generating.current = true;
    setStage("loading");
    setLoadingSaved(false);
    setErrorAction("generate");
    setErrorMessage(null);

    try {
      const { payload, bpRows, moodRows } = await gatherThirtyDayData(user.id);
      if (!current()) return;
      const result = await generateDoctorSummary(payload);
      if (!current()) return;
      const timestamp = new Date().toISOString();
      if (appointmentId) {
        const { error } = await supabase.from("appointments").update({ summary: { summary: result, bpRows, moodRows, generatedAt: timestamp } }).eq("id", appointmentId).eq("user_id", user.id).select("id").single();
        if (error) throw new SummaryPreparationError("The summary could not be saved to your appointment. Please retry.");
      }
      if (!current()) return;
      setGeneratedAt(timestamp);
      setSummary(result);
      setRawBp(bpRows);
      setRawMood(moodRows);
      setStage("ready");
    } catch (err) {
      if (!current()) return;
      console.warn("[doctor-prep] generation failed:", err);
      setErrorMessage(err instanceof AiAccessError || err instanceof SummaryPreparationError
        ? err.message
        : "The summary could not be generated. Please check your connection and try again.");
      setStage("error");
    } finally { if (current()) generating.current = false; }
  }, [user, appointmentId]);

  const handleExportPdf = useCallback(async () => {
    if (!summary) return;
    setIsExporting(true);
    try {
      await exportDoctorSummary({
        patientName: profile?.fullName ?? "Kairos user",
        generatedAt: new Date(generatedAt).toLocaleString(),
        windowDays: DAYS_BACK,
        patientContext: summary.patient_context,
        vitalsSummary: summary.vitals_summary,
        symptomSummary: summary.symptom_summary,
        moodSummary: summary.mood_summary,
        riskFactors: summary.risk_factors,
        questionsToAsk: summary.questions_to_ask,
        urgentConcerns: summary.urgent_concerns,
        bpReadings: rawBp,
        moodEntries: rawMood,
      });
    } catch (err) {
      console.warn("[doctor-prep] export failed", err);
      Alert.alert("Export failed", "The PDF could not be exported. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [summary, profile, rawBp, rawMood, generatedAt]);

  // ----- Render --------------------------------------------------------

  if (stage === "loading") {
    return (
      <Screen>
        <Heading level={2}>{loadingSaved ? "Loading your saved summary…" : "Preparing your visit summary…"}</Heading>
        <Card>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color={colors.accent.rose} />
          </View>
          <Body tone="muted">
            {loadingSaved ? "Retrieving the summary saved with this appointment." : `Gathering the past ${DAYS_BACK} days of your health records, then organizing them into a visit summary.`}
          </Body>
          {!loadingSaved && <Body tone="muted" size="sm">This usually takes 10–20 seconds.</Body>}
        </Card>
      </Screen>
    );
  }

  if (stage === "ready" && summary) {
    const hasUrgent = summary.urgent_concerns.length > 0;
    return (
      <Screen>
        <Heading level={2}>Your visit summary</Heading>
        <Body tone="muted">
          Generated {new Date(generatedAt).toLocaleDateString()} · Based on the past {DAYS_BACK} days
        </Body>

        {hasUrgent && (
          <Card style={{ backgroundColor: colors.status.redBg }}>
            <Heading level={3} style={{ color: colors.status.red }}>
              ⚠️ Urgent concerns
            </Heading>
            {summary.urgent_concerns.map((c, i) => (
              <Body key={`urg-${i}`}>• {c}</Body>
            ))}
            <Body tone="muted" size="sm">
              Consider contacting your provider before your next scheduled visit.
            </Body>
          </Card>
        )}

        <SectionCard title="Patient context" items={summary.patient_context} />
        <SectionCard title={`Vitals · past ${DAYS_BACK} days`} items={summary.vitals_summary} />
        <SectionCard title="Symptoms" items={summary.symptom_summary} />
        <SectionCard title="Mood" items={summary.mood_summary} />
        <SectionCard title="Risk factors" items={summary.risk_factors} />
        <SectionCard title="Questions to ask" items={summary.questions_to_ask} />

        <Button
          label={isExporting ? "Preparing PDF…" : "Export as PDF"}
          onPress={handleExportPdf}
          disabled={isExporting}
        />
        <Button label="Regenerate" variant="secondary" onPress={handleGenerate} disabled={isExporting} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (stage === "error") {
    return (
      <Screen>
        <Heading level={2}>Summary unavailable</Heading>
        <Card>
          <Body>{errorMessage ?? "Unknown error"}</Body>
        </Card>
        {errorAction === "load" && <Button label="Retry loading" onPress={() => setLoadRevision(value => value + 1)} />}
        {errorAction === "generate" && <Button label="Generate again" onPress={handleGenerate} />}
        {errorAction === "none" && <Button label="View appointments" onPress={() => router.replace("/(app)/appointments")} />}
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  // idle
  return (
    <Screen>
      <Heading level={2}>Prepare for your visit</Heading>
      <Body tone="muted">
        Walk into your appointment with a clear, organised summary of how
        you have actually been — backed by data — and a list of questions
        worth asking. Your doctor will thank you.
      </Body>

      <Card>
        <Heading level={3}>What we will do</Heading>
        <Body>
          We will look at the past {DAYS_BACK} days of your vitals, mood,
          voice journal entries, symptoms, and chats with Kairos, then ask
          our AI to produce a clinician-style summary plus tailored
          questions for your appointment.
        </Body>
        <Body tone="muted" size="sm">
          You can export it as a PDF (includes a raw BP table for verification)
          to print or message to your provider.
        </Body>
      </Card>

      <Button label="Generate summary" onPress={handleGenerate} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function SectionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <Heading level={3}>{title}</Heading>
      {items.length === 0 ? (
        <Body tone="muted">No notable findings.</Body>
      ) : (
        items.map((s, i) => (
          <Body key={`${title}-${i}`} style={styles.bullet}>
            • {s}
          </Body>
        ))
      )}
    </Card>
  );
}

// ---- helpers --------------------------------------------------------

/**
 * Gather every signal we have about the user in the past 30 days plus
 * baseline history. Returns:
 *   - `payload`: shape suitable for the Gemini prompt (anything goes)
 *   - `bpRows` / `moodRows`: typed arrays used by the PDF data tables
 */
async function gatherThirtyDayData(userId: string): Promise<GatheredData> {
  const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();

  const [bp, vitals, mood, voice, symptoms, chat, profile, pregnancy, family] = await Promise.all([
    supabase
      .from("bp_readings")
      .select("systolic, diastolic, pulse, measured_at, source")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: true }),
    supabase
      .from("vitals_log")
      .select("measurement_type, heart_rate, hrv_ms, confidence_score, measured_at")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: true }),
    supabase
      .from("mood_entries")
      .select("mood, note, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: true }),
    supabase
      .from("voice_journal_entries")
      .select("raw_transcript, ai_summary, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", since)
      // Newest first so the cap keeps the most recent (most clinically
      // relevant) entries; re-sorted chronologically below for the prompt.
      .order("recorded_at", { ascending: false })
      .limit(MAX_VOICE_ENTRIES),
    supabase
      .from("symptom_reports")
      .select("symptoms, severity, notes, reported_at")
      .eq("user_id", userId)
      .gte("reported_at", since)
      .order("reported_at", { ascending: true }),
    supabase
      .from("chat_messages")
      .select("content, created_at")
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_CHAT_EXCERPTS),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("pregnancy_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("family_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // supabase-js reports failures via the error field without throwing.
  // A summary silently built on missing data would tell the clinician
  // "no readings recorded" — fail loudly instead and let the error screen
  // offer a retry.
  const queries = { bp, vitals, mood, voice, symptoms, chat, profile, pregnancy, family };
  for (const [name, res] of Object.entries(queries)) {
    if (res.error) {
      console.warn(`[doctor-prep] ${name} query failed`, res.error);
      throw new SummaryPreparationError("Some health records could not be loaded. Please try again before generating a summary.");
    }
  }

  const bpRows: BpRow[] = (bp.data ?? []).map((r: any) => ({
    measuredAt: r.measured_at,
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse,
    source: r.source ?? "manual",
  }));
  const moodRows: MoodRow[] = (mood.data ?? []).map((r: any) => ({
    loggedAt: r.logged_at,
    mood: r.mood,
    note: r.note,
  }));

  const payload = {
    window_days: DAYS_BACK,
    profile: profile.data,
    pregnancy_history: pregnancy.data,
    family_history: family.data,
    bp_readings: bp.data ?? [],
    rppg_measurements: vitals.data ?? [],
    mood_entries: mood.data ?? [],
    voice_journal_entries: [...(voice.data ?? [])].reverse(),
    symptom_reports: symptoms.data ?? [],
    user_chat_excerpts: [...(chat.data ?? [])].reverse().map((m: any) => ({
      at: m.created_at,
      text: m.content,
    })),
  };

  return { payload, bpRows, moodRows };
}

const styles = StyleSheet.create({
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  bullet: {
    marginBottom: spacing.xs,
  },
});
