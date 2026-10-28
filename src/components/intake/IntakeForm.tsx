import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body } from "@/components/ui/Body";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { IntakeAnswers, IntakeQuestion, IntakeSection, validateAnswers } from "@/lib/intake";
import { colors, typography } from "@/theme";

export function IntakeForm({ sections, initialAnswers, onSave, submitLabel = "Continue", title = "Onboarding", onCancel }: {
  sections: IntakeSection[];
  initialAnswers: IntakeAnswers;
  onSave: (answers: IntakeAnswers) => Promise<void>;
  submitLabel?: string;
  title?: string;
  onCancel?: () => void;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const section = sections[step];
  async function next() {
    if (busy.current) return;
    const validation = validateAnswers(section.questions, answers);
    if (validation) { setError(validation); return; }
    setError(null);
    if (step < sections.length - 1) {
      setStep(step + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    busy.current = true;
    setSaving(true);
    try { await onSave(answers); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save. Please try again."); }
    finally { busy.current = false; setSaving(false); }
  }
  return (
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Body tone="muted">{section.title}</Body>
      {sections.length > 1 && <View style={styles.progress} accessibilityLabel={`Step ${step + 1} of ${sections.length}`}>
        {sections.map((s, i) => <View key={s.title} style={[styles.progressPart, i <= step && styles.progressActive]} />)}
      </View>}
      <Body size="sm" tone="muted">All questions are optional. Blank or “not sure” answers remain unknown.</Body>
      <View style={styles.fields}>
        {section.questions.map(question => <Question key={question.key} question={question} value={answers[question.key] ?? ""} disabled={saving} onChange={value => setAnswers(a => ({ ...a, [question.key]: value }))} />)}
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label={saving ? "Saving…" : step < sections.length - 1 ? "Continue" : submitLabel} onPress={next} disabled={saving} />
      {onCancel && <Button label="Cancel" variant="ghost" disabled={saving} onPress={onCancel} />}
      {step > 0 && <Button label="Previous" variant="ghost" disabled={saving} onPress={() => { setError(null); setStep(step - 1); scroll.current?.scrollTo({ y: 0, animated: false }); }} />}
    </ScrollView>
  );
}

function Question({ question, value, onChange, disabled }: { question: IntakeQuestion; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (!question.choices) return <TextField label={question.label} accessibilityLabel={question.label} value={value} onChangeText={onChange} placeholder={question.placeholder} editable={!disabled} maxLength={1000} keyboardType={question.number ? "decimal-pad" : "default"} />;
  return <View style={styles.field}>
    <Text style={styles.label}>{question.label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${question.label}: ${value || "Not answered"}`} accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(true)} style={styles.select}>
      <Text style={[styles.option, !value && styles.placeholder]}>{value || "Select an answer"}</Text><Text style={styles.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close choices" accessibilityRole="button" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <Text style={styles.label}>{question.label}</Text>
          {[...question.choices, "Leave unanswered"].map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: value === choice || (!value && choice === "Leave unanswered") }} onPress={() => { onChange(choice === "Leave unanswered" ? "" : choice); setOpen(false); }} style={styles.choice}>
            <Text style={styles.option}>{choice}</Text>{value === choice && <Text style={styles.option}>✓</Text>}
          </Pressable>)}
          <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  content: { paddingTop: 60, paddingHorizontal: 30, paddingBottom: 48, gap: 18 },
  title: { color: "white", fontFamily: typography.family.brand, fontSize: 40, lineHeight: 58 },
  fields: { gap: 30, paddingVertical: 16 },
  field: { gap: 6 },
  label: { color: colors.fg.primary, fontSize: 16, lineHeight: 24, fontWeight: "500" },
  select: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.input, flexDirection: "row", alignItems: "center", gap: 8 },
  option: { color: "white", fontSize: 16, lineHeight: 24, flexShrink: 1 },
  placeholder: { color: colors.fg.placeholder },
  chevron: { marginLeft: "auto", color: "white", fontSize: 22 },
  overlay: { flex: 1, backgroundColor: "rgba(0,16,60,0.65)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: "#1750AC", borderRadius: 20, maxHeight: "85%", maxWidth: 440, width: "100%", alignSelf: "center", overflow: "hidden" },
  sheetContent: { padding: 24, gap: 12 },
  choice: { minHeight: 48, borderBottomWidth: 1, borderColor: colors.border.default, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  progress: { flexDirection: "row", gap: 6, marginVertical: 8 },
  progressPart: { height: 3, backgroundColor: "rgba(255,255,255,0.2)", flex: 1, borderRadius: 3 },
  progressActive: { backgroundColor: "rgba(255,255,255,0.85)" },
  error: { color: "#FFE8E8", fontSize: 16, lineHeight: 24 },
});
