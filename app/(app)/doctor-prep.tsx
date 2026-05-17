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

import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/contexts/UserDataContext";
import { DoctorSummary, generateDoctorSummary } from "@/services/gemini";
import { BpRow, exportDoctorSummary, MoodRow } from "@/services/pdf";
import { supabase } from "@/services/supabase";
import { colors, spacing } from "@/theme";

type Stage = "idle" | "loading" | "ready" | "error";

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
  const { profile } = useUserData();

  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [rawBp, setRawBp] = useState<BpRow[]>([]);
  const [rawMood, setRawMood] = useState<MoodRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in first.");
      return;
    }
    setStage("loading");
    setErrorMessage(null);

    try {
      const { payload, bpRows, moodRows } = await gatherThirtyDayData(user.id);
      const result = await generateDoctorSummary(payload);
      setSummary(result);
      setRawBp(bpRows);
      setRawMood(moodRows);
      setStage("ready");
    } catch (err) {
      console.warn("[doctor-prep] generation failed:", err);
      setErrorMessage((err as Error)?.message ?? "Unknown error");
      setStage("error");
    }
  }, [user]);

  const handleExportPdf = useCallback(async () => {
    if (!summary) return;
    setIsExporting(true);
    try {
      await exportDoctorSummary({
        patientName: profile?.fullName ?? "Kairos user",
        generatedAt: new Date().toLocaleString(),
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
      Alert.alert("Export failed", (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [summary, profile?.fullName, rawBp, rawMood]);

  // ----- Render --------------------------------------------------------

  if (stage === "loading") {
    return (
      <Screen>
        <Heading level={2}>Preparing your visit summary…</Heading>
        <Card>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color={colors.accent.rose} />
          </View>
          <Body tone="muted">
            Gathering the past {DAYS_BACK} days of vitals, mood, voice notes,
            symptom reports, and your chats with Kairos — then asking the AI
            to organise it the way a clinician would want to see it.
          </Body>
          <Body tone="muted" size="sm">
            This usually takes 10–20 seconds.
          </Body>
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
          Generated {new Date().toLocaleDateString()} · Based on the past {DAYS_BACK} days
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
        <Heading level={2}>Couldn't build the summary</Heading>
        <Card>
          <Body>{errorMessage ?? "Unknown error"}</Body>
        </Card>
        <Body tone="muted" size="sm">
          This often resolves on a retry. If it keeps failing, you may have run
          out of AI quota or the network is unreachable.
        </Body>
        <Button label="Try again" onPress={handleGenerate} />
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
        you've actually been — backed by data — and a list of questions
        worth asking. Your doctor will thank you.
      </Body>

      <Card>
        <Heading level={3}>What we'll do</Heading>
        <Body>
          We'll look at the past {DAYS_BACK} days of your vitals, mood,
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
      .order("recorded_at", { ascending: true })
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
      .order("created_at", { ascending: true })
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
    voice_journal_entries: voice.data ?? [],
    symptom_reports: symptoms.data ?? [],
    user_chat_excerpts: (chat.data ?? []).map((m: any) => ({
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
